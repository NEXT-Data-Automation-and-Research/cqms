/**
 * Reversal Repository
 * Handles database operations for reversals
 */

import type { ReversalRequest, ReversalWorkflowState, ReversalWorkflowStateType } from '../domain/types.js';

export class ReversalRepository {
  constructor(private supabase: any) {}

  /**
   * Get all reversal requests with optional filters
   */
  async getReversalRequests(options: {
    requestedByEmail?: string;
    onlyPending?: boolean;
    limit?: number;
  } = {}): Promise<ReversalRequest[]> {
    try {
      console.log('[ReversalRepository] getReversalRequests called with options:', options);
      
      let query = this.supabase
        .from('reversal_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (options.requestedByEmail) {
        query = query.eq('requested_by_email', options.requestedByEmail);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      console.log('[ReversalRepository] Query result - count:', data?.length || 0, 'error:', error);

      if (error) throw error;

      // Filter pending if needed (based on workflow state)
      if (options.onlyPending && data) {
        const reversalIds = data.map((rr: ReversalRequest) => rr.id);
        const workflowStates = await this.getWorkflowStates(reversalIds);
        const wsMap = new Map<string, ReversalWorkflowStateType>();
        workflowStates.forEach(ws => {
          if (ws.is_current) {
            wsMap.set(ws.reversal_request_id, ws.state);
          }
        });

        const pendingStates: ReversalWorkflowStateType[] = [
          'submitted',
          'team_lead_review',
          'qa_review',
          'cqc_review',
          'cqc_sent_back',
          'agent_re_review'
        ];

        return data.filter((rr: ReversalRequest) => {
          const state = wsMap.get(rr.id) || 'submitted';
          return pendingStates.includes(state);
        });
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reversal requests:', error);
      throw error;
    }
  }

  /**
   * Get workflow states for reversal requests
   */
  async getWorkflowStates(reversalRequestIds: string[]): Promise<ReversalWorkflowState[]> {
    try {
      if (!reversalRequestIds || reversalRequestIds.length === 0) {
        return [];
      }

      const { data, error } = await this.supabase
        .from('reversal_workflow_states')
        .select('*')
        .in('reversal_request_id', reversalRequestIds)
        .eq('is_current', true);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching workflow states:', error);
      return [];
    }
  }

  /**
   * Get a single reversal request by ID
   */
  async getReversalRequestById(id: string): Promise<ReversalRequest | null> {
    try {
      const { data, error } = await this.supabase
        .from('reversal_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching reversal request:', error);
      return null;
    }
  }

  /**
   * Update a reversal request
   */
  async updateReversalRequest(
    id: string,
    updates: Partial<ReversalRequest>
  ): Promise<ReversalRequest> {
    try {
      const { data, error } = await this.supabase
        .from('reversal_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating reversal request:', error);
      throw error;
    }
  }

  /**
   * Update workflow state for a reversal request
   */
  async updateWorkflowState(
    reversalRequestId: string,
    newState: ReversalWorkflowStateType
  ): Promise<void> {
    try {
      // First, mark all current states as not current
      await this.supabase
        .from('reversal_workflow_states')
        .update({ is_current: false })
        .eq('reversal_request_id', reversalRequestId)
        .eq('is_current', true);

      // Then, insert new state
      const { error } = await this.supabase
        .from('reversal_workflow_states')
        .insert({
          reversal_request_id: reversalRequestId,
          state: newState,
          is_current: true
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating workflow state:', error);
      throw error;
    }
  }

  /**
   * Process a reversal (approve or reject)
   */
  async processReversal(
    reversalRequestId: string,
    decision: 'approved' | 'rejected',
    updates: {
      new_score?: number;
      final_decision_by_name?: string;
      final_decision_by_email?: string;
      sla_hours?: number;
    }
  ): Promise<void> {
    try {
      // Update reversal request
      await this.updateReversalRequest(reversalRequestId, {
        final_decision: decision,
        final_decision_at: new Date().toISOString(),
        new_score: updates.new_score,
        final_decision_by_name: updates.final_decision_by_name,
        final_decision_by_email: updates.final_decision_by_email,
        sla_hours: updates.sla_hours
      });

      // Update workflow state
      await this.updateWorkflowState(reversalRequestId, decision);
    } catch (error) {
      console.error('Error processing reversal:', error);
      throw error;
    }
  }

  /**
   * Get audit data for a reversal request
   */
  async getAuditDataForReversal(
    auditId: string,
    tableName: string
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('id', auditId)
        .single();

      if (error) {
        if (error.code === 404 || (error as any).code === 'PGRST116' || (String((error as any).message || '').includes('does not exist'))) {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      const err = error as any;
      if (err?.code === 404 || err?.code === 'PGRST116' || (err?.message && String(err.message).includes('does not exist'))) {
        return null;
      }
      console.error(`Error fetching audit data from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Batch get audit data for multiple reversals
   */
  async batchGetAuditData(
    reversals: Array<{ audit_id: string; scorecard_table_name: string }>
  ): Promise<Map<string, any>> {
    const auditDataMap = new Map<string, any>();

    // Group by table name for batch queries
    const reversalsByTable = new Map<string, string[]>();
    reversals.forEach(rev => {
      if (!reversalsByTable.has(rev.scorecard_table_name)) {
        reversalsByTable.set(rev.scorecard_table_name, []);
      }
      reversalsByTable.get(rev.scorecard_table_name)!.push(rev.audit_id);
    });

    // Fetch audits in parallel
    const fetchPromises = Array.from(reversalsByTable.entries()).map(
      async ([tableName, auditIds]) => {
        try {
          const BATCH_SIZE = 100;
          if (auditIds.length <= BATCH_SIZE) {
            const { data, error } = await this.supabase
              .from(tableName)
              .select('*')
              .in('id', auditIds);

            if (error) {
              if (error.code === 404 || (error as any).code === 'PGRST116' || (String((error as any).message || '').includes('does not exist'))) {
                return;
              }
              console.warn(`Error loading audits from ${tableName}:`, error);
              return;
            }

            if (data) {
              data.forEach((audit: any) => {
                auditDataMap.set(audit.id, audit);
              });
            }
          } else {
            // Batch large queries
            const batchPromises = [];
            for (let i = 0; i < auditIds.length; i += BATCH_SIZE) {
              const batch = auditIds.slice(i, i + BATCH_SIZE);
              batchPromises.push(
                this.supabase
                  .from(tableName)
                  .select('*')
                  .in('id', batch)
                  .then(({ data, error }: any) => {
                    if (error) {
                      if (error.code === 404 || error.code === 'PGRST116' || (error.message && String(error.message).includes('does not exist'))) {
                        return;
                      }
                      console.warn(`Error loading audit batch from ${tableName}:`, error);
                      return;
                    }
                    if (data) {
                      data.forEach((audit: any) => {
                        auditDataMap.set(audit.id, audit);
                      });
                    }
                  })
              );
            }
            await Promise.all(batchPromises);
          }
        } catch (err) {
          console.warn(`Exception loading audits from ${tableName}:`, err);
        }
      }
    );

    await Promise.all(fetchPromises);

    return auditDataMap;
  }

  /**
   * Update audit table with reversal data
   */
  async updateAuditTable(
    tableName: string,
    auditId: string,
    updateData: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .update(updateData)
        .eq('id', auditId);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating audit table ${tableName}:`, error);
      throw error;
    }
  }
}
