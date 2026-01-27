/**
 * Audit Data Service
 * Centralized service for loading and saving audit data
 * Extracted from inline logic in new-audit-form.html and audit-view.html
 */

import type { AuditFormData, Scorecard, ScorecardParameter } from '../entities.js';

export interface LoadAuditResult {
  audit: AuditFormData | null;
  scorecard: Scorecard | null;
  parameters: ScorecardParameter[];
  error: Error | null;
}

export interface SaveAuditResult {
  success: boolean;
  auditId: string | null;
  error: Error | null;
}

/**
 * Map snake_case database fields to camelCase entity fields
 */
function mapDatabaseToEntity(data: Record<string, any>): AuditFormData {
  return {
    id: data.id,
    employeeEmail: data.employee_email || '',
    employeeName: data.employee_name || '',
    employeeType: data.employee_type || '',
    employeeDepartment: data.employee_department || '',
    countryOfEmployee: data.country_of_employee || '',
    auditorEmail: data.auditor_email || '',
    auditorName: data.auditor_name || '',
    interactionId: data.interaction_id ? String(data.interaction_id) : '',
    interactionDate: data.interaction_date || '',
    channel: data.channel || '',
    clientEmail: data.client_email || '',
    clientName: data.client_name || '',
    transcript: data.transcript || '',
    scorecardId: data._scorecard_id || data.scorecard_id || '',
    scorecardTableName: data._scorecard_table || '',
    quarter: data.quarter || '',
    week: data.week || 0,
    auditTimestamp: data.submitted_at || data.audit_timestamp || '',
    auditType: data.audit_type || '',
    passingStatus: data.passing_status || '',
    averageScore: data.average_score,
    totalErrorsCount: data.total_errors_count,
    criticalErrors: data.critical_errors,
    criticalFailError: data.critical_fail_error,
    significantError: data.significant_error,
    errorDescription: data.error_description || '',
    recommendations: data.recommendations || '',
    validationStatus: data.validation_status || '',
    parameterComments: data.parameter_comments || {},
    auditDuration: data.audit_duration,
    auditStartTime: data.audit_start_time,
    auditEndTime: data.audit_end_time,
    intercomAlias: data.intercom_alias || '',
    conversationId: data.conversation_id || '',
    submittedAt: data.submitted_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Map camelCase entity fields to snake_case database fields
 */
function mapEntityToDatabase(audit: Partial<AuditFormData>, scorecardId?: string, tableName?: string): Record<string, any> {
  const payload: Record<string, any> = {};
  
  if (audit.id) payload.id = audit.id;
  if (audit.employeeEmail !== undefined) payload.employee_email = audit.employeeEmail || null;
  if (audit.employeeName !== undefined) payload.employee_name = audit.employeeName || null;
  if (audit.employeeType !== undefined) payload.employee_type = audit.employeeType || null;
  if (audit.employeeDepartment !== undefined) payload.employee_department = audit.employeeDepartment || null;
  if (audit.countryOfEmployee !== undefined) payload.country_of_employee = audit.countryOfEmployee || null;
  if (audit.auditorEmail !== undefined) payload.auditor_email = audit.auditorEmail || null;
  if (audit.auditorName !== undefined) payload.auditor_name = audit.auditorName || null;
  if (audit.interactionId !== undefined) payload.interaction_id = audit.interactionId || null;
  if (audit.interactionDate !== undefined) payload.interaction_date = audit.interactionDate || null;
  if (audit.channel !== undefined) payload.channel = audit.channel || null;
  if (audit.clientEmail !== undefined) payload.client_email = audit.clientEmail || null;
  if (audit.transcript !== undefined) payload.transcript = audit.transcript || null;
  if (audit.quarter !== undefined) payload.quarter = audit.quarter || null;
  if (audit.week !== undefined) payload.week = audit.week || null;
  if (audit.auditType !== undefined) payload.audit_type = audit.auditType || null;
  if (audit.passingStatus !== undefined) payload.passing_status = audit.passingStatus || null;
  if (audit.averageScore !== undefined) payload.average_score = audit.averageScore;
  if (audit.totalErrorsCount !== undefined) payload.total_errors_count = audit.totalErrorsCount;
  if (audit.criticalErrors !== undefined) payload.critical_errors = audit.criticalErrors;
  if (audit.criticalFailError !== undefined) payload.critical_fail_error = audit.criticalFailError;
  if (audit.significantError !== undefined) payload.significant_error = audit.significantError;
  if (audit.errorDescription !== undefined) payload.error_description = audit.errorDescription || null;
  if (audit.recommendations !== undefined) payload.recommendations = audit.recommendations || null;
  if (audit.validationStatus !== undefined) payload.validation_status = audit.validationStatus || null;
  if (audit.parameterComments !== undefined) payload.parameter_comments = audit.parameterComments || {};
  if (audit.auditDuration !== undefined) payload.audit_duration = audit.auditDuration;
  if (audit.auditStartTime !== undefined) payload.audit_start_time = audit.auditStartTime;
  if (audit.auditEndTime !== undefined) payload.audit_end_time = audit.auditEndTime;
  if (audit.submittedAt !== undefined) payload.submitted_at = audit.submittedAt;
  
  // Always set scorecard reference fields
  if (scorecardId) {
    payload._scorecard_id = scorecardId;
  }
  if (tableName) {
    payload._scorecard_table = tableName;
  }
  
  return payload;
}

/**
 * Map database parameter to entity parameter
 */
function mapParameterToEntity(param: Record<string, any>): ScorecardParameter {
  return {
    id: param.id,
    scorecardId: param.scorecard_id,
    errorName: param.error_name,
    penaltyPoints: parseFloat(param.penalty_points) || 0,
    errorCategory: param.error_category || '',
    fieldId: param.field_id,
    fieldType: param.field_type || 'counter',
    requiresFeedback: param.requires_feedback || false,
    displayOrder: param.display_order || 0,
    isActive: param.is_active !== false,
    parameterType: param.parameter_type || 'error',
    pointsDirection: param.points_direction || 'subtract',
    isFailAll: param.is_fail_all || false,
    description: param.description || '',
  };
}

/**
 * Map database scorecard to entity scorecard
 */
function mapScorecardToEntity(data: Record<string, any>): Scorecard {
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    passingThreshold: parseFloat(data.passing_threshold) || 85,
    tableName: data.table_name,
    scoringType: data.scoring_type || 'deductive',
    channels: data.channels || '',
    isActive: data.is_active !== false,
    defaultForChannels: data.default_for_channels || '',
    allowOver100: data.allow_over_100 || false,
    maxBonusPoints: data.max_bonus_points || '0',
    createdAt: data.created_at,
  };
}

export class AuditDataService {
  private supabaseClient: any;

  constructor() {
    this.supabaseClient = null;
  }

  /**
   * Initialize with Supabase client
   */
  async initialize(): Promise<boolean> {
    // Wait for Supabase client to be ready
    let attempts = 0;
    while (!(window as any).supabaseClient && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    this.supabaseClient = (window as any).supabaseClient;
    return !!this.supabaseClient;
  }

  /**
   * Load audit by ID from specified table
   */
  async loadAudit(auditId: string, tableName: string, scorecardId?: string): Promise<LoadAuditResult> {
    try {
      if (!this.supabaseClient) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { audit: null, scorecard: null, parameters: [], error: new Error('Supabase client not available') };
        }
      }

      // Load audit data
      const { data: auditData, error: auditError } = await this.supabaseClient
        .from(tableName)
        .select('*')
        .eq('id', auditId)
        .single();

      if (auditError) {
        return { audit: null, scorecard: null, parameters: [], error: auditError };
      }

      if (!auditData) {
        return { audit: null, scorecard: null, parameters: [], error: new Error('Audit not found') };
      }

      const audit = mapDatabaseToEntity(auditData);
      
      // Determine scorecard ID
      const finalScorecardId = scorecardId || auditData._scorecard_id || auditData.scorecard_id;
      
      let scorecard: Scorecard | null = null;
      let parameters: ScorecardParameter[] = [];

      if (finalScorecardId) {
        // Load scorecard
        const { data: scorecardData, error: scorecardError } = await this.supabaseClient
          .from('scorecards')
          .select('*')
          .eq('id', finalScorecardId)
          .single();

        if (!scorecardError && scorecardData) {
          scorecard = mapScorecardToEntity(scorecardData);
        }

        // Load parameters
        const { data: paramsData, error: paramsError } = await this.supabaseClient
          .from('scorecard_perameters')
          .select('*')
          .eq('scorecard_id', finalScorecardId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!paramsError && paramsData) {
          parameters = paramsData.map(mapParameterToEntity);
        }
      }

      return { audit, scorecard, parameters, error: null };
    } catch (error) {
      return { audit: null, scorecard: null, parameters: [], error: error as Error };
    }
  }

  /**
   * Save new audit
   */
  async saveAudit(
    audit: Partial<AuditFormData>,
    tableName: string,
    scorecardId: string,
    parameterValues?: Record<string, number>,
    parameterFeedback?: Record<string, string[]>
  ): Promise<SaveAuditResult> {
    try {
      if (!this.supabaseClient) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, auditId: null, error: new Error('Supabase client not available') };
        }
      }

      const payload = mapEntityToDatabase(audit, scorecardId, tableName);
      
      // Add parameter values
      if (parameterValues) {
        for (const [fieldId, value] of Object.entries(parameterValues)) {
          payload[fieldId] = value;
        }
      }

      // Add parameter feedback
      if (parameterFeedback) {
        for (const [fieldId, feedback] of Object.entries(parameterFeedback)) {
          payload[`feedback_${fieldId}`] = feedback.length > 0 ? feedback : null;
        }
      }

      const { data, error } = await this.supabaseClient
        .from(tableName)
        .insert([payload])
        .select();

      if (error) {
        return { success: false, auditId: null, error };
      }

      const auditId = data?.[0]?.id || payload.id;
      return { success: true, auditId, error: null };
    } catch (error) {
      return { success: false, auditId: null, error: error as Error };
    }
  }

  /**
   * Update existing audit
   */
  async updateAudit(
    auditId: string,
    audit: Partial<AuditFormData>,
    tableName: string,
    scorecardId?: string,
    parameterValues?: Record<string, number>,
    parameterFeedback?: Record<string, string[]>
  ): Promise<SaveAuditResult> {
    try {
      if (!this.supabaseClient) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, auditId: null, error: new Error('Supabase client not available') };
        }
      }

      const payload = mapEntityToDatabase(audit, scorecardId, tableName);
      
      // Don't update submitted_at when editing
      delete payload.submitted_at;
      
      // Add parameter values
      if (parameterValues) {
        for (const [fieldId, value] of Object.entries(parameterValues)) {
          payload[fieldId] = value;
        }
      }

      // Add parameter feedback
      if (parameterFeedback) {
        for (const [fieldId, feedback] of Object.entries(parameterFeedback)) {
          payload[`feedback_${fieldId}`] = feedback.length > 0 ? feedback : null;
        }
      }

      const { data, error } = await this.supabaseClient
        .from(tableName)
        .update(payload)
        .eq('id', auditId)
        .select();

      if (error) {
        return { success: false, auditId: null, error };
      }

      return { success: true, auditId, error: null };
    } catch (error) {
      return { success: false, auditId: null, error: error as Error };
    }
  }

  /**
   * Load scorecard by ID
   */
  async loadScorecard(scorecardId: string): Promise<Scorecard | null> {
    try {
      if (!this.supabaseClient) {
        const initialized = await this.initialize();
        if (!initialized) return null;
      }

      const { data, error } = await this.supabaseClient
        .from('scorecards')
        .select('*')
        .eq('id', scorecardId)
        .single();

      if (error || !data) return null;
      return mapScorecardToEntity(data);
    } catch {
      return null;
    }
  }

  /**
   * Load parameters for scorecard
   */
  async loadParameters(scorecardId: string): Promise<ScorecardParameter[]> {
    try {
      if (!this.supabaseClient) {
        const initialized = await this.initialize();
        if (!initialized) return [];
      }

      const { data, error } = await this.supabaseClient
        .from('scorecard_perameters')
        .select('*')
        .eq('scorecard_id', scorecardId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      return data.map(mapParameterToEntity);
    } catch {
      return [];
    }
  }

  /**
   * Load all active scorecards
   */
  async loadScorecards(channelFilter?: string): Promise<Scorecard[]> {
    try {
      if (!this.supabaseClient) {
        const initialized = await this.initialize();
        if (!initialized) return [];
      }

      let query = this.supabaseClient
        .from('scorecards')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (channelFilter) {
        query = query.ilike('channels', `%${channelFilter}%`);
      }

      const { data, error } = await query;

      if (error || !data) return [];
      return data.map(mapScorecardToEntity);
    } catch {
      return [];
    }
  }
}

// Singleton instance
let auditDataServiceInstance: AuditDataService | null = null;

/**
 * Get audit data service instance
 */
export function getAuditDataService(): AuditDataService {
  if (!auditDataServiceInstance) {
    auditDataServiceInstance = new AuditDataService();
  }
  return auditDataServiceInstance;
}

// Export for window access
if (typeof window !== 'undefined') {
  (window as any).AuditDataService = AuditDataService;
  (window as any).getAuditDataService = getAuditDataService;
}
