/**
 * Infrastructure Layer - Auditor Dashboard Repository
 * Handles all database operations for the auditor dashboard
 */

import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { AUDIT_ASSIGNMENT_FIELDS } from '../../../core/constants/field-whitelists.js';
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';
import type {
  Assignment,
  Auditor,
  AuditorStats,
  AuditData,
  PeriodDates,
  Scorecard,
  TeamStats,
  StandupViewData,
  HourlyBreakdown
} from '../domain/entities.js';

export class AuditorDashboardRepository {
  constructor(private db: IDatabaseClient) {}
  /**
   * Load all users (auditors) from database
   * Gets auditors from audit_assignments and enriches with people table data
   */
  async loadAllUsers(): Promise<Auditor[]> {
    // #region agent log
    logInfo('[DEBUG] loadAllUsers entry - hypothesis A');
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:25',message:'loadAllUsers entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e)=>logWarn('[DEBUG] Fetch failed:',e));
    // #endregion
    try {
      // Check cache first
      const cachedUsers = sessionStorage.getItem('cachedUsers');
      const cachedUsersTime = sessionStorage.getItem('cachedUsersTime');
      const cacheAge = cachedUsersTime ? Date.now() - parseInt(cachedUsersTime) : Infinity;

      if (cachedUsers && cacheAge < 300000) { // 5 minutes cache
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:33',message:'loadAllUsers cache hit',data:{count:JSON.parse(cachedUsers).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return JSON.parse(cachedUsers);
      }

      // Get distinct auditor emails from audit_assignments
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:37',message:'loadAllUsers querying audit_assignments',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const { data: assignmentsData, error: assignmentsError } = await this.db
        .from('audit_assignments')
        .select('auditor_email')
        .not('auditor_email', 'is', null)
        .execute<{ auditor_email: string }[]>();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:43',message:'loadAllUsers assignments query result',data:{hasError:!!assignmentsError,error:assignmentsError?.message,dataCount:assignmentsData?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (assignmentsError) throw assignmentsError;

      const auditorEmails = [...new Set(
        (assignmentsData || [])
          .map(a => a.auditor_email)
          .filter(Boolean)
      )];

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:50',message:'loadAllUsers unique auditor emails',data:{count:auditorEmails.length,emails:auditorEmails.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (auditorEmails.length === 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:52',message:'loadAllUsers no auditors found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return [];
      }

      // Load people data for these auditors
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:56',message:'loadAllUsers querying people',data:{emailCount:auditorEmails.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const { data: peopleData, error: peopleError } = await this.db
        .from('people')
        .select('email, name, role, channel')
        .in('email', auditorEmails)
        .execute<{ email: string; name: string; role: string; channel: string }[]>();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:60',message:'loadAllUsers people query result',data:{hasError:!!peopleError,error:peopleError?.message,peopleCount:peopleData?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Create a map of email -> person data
      const peopleMap = new Map(
        (peopleData || []).map(p => [p.email.toLowerCase(), p])
      );

      // Build auditor list, using people data when available
      const users: Auditor[] = auditorEmails.map(email => {
        const person = peopleMap.get(email.toLowerCase());
        return {
          email,
          name: person?.name || email.split('@')[0] || email,
          role: person?.role || 'Unknown',
          channel: person?.channel || undefined
        };
      });

      // #region agent log
      logInfo('[DEBUG] loadAllUsers returning', { count: users.length });
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:82',message:'loadAllUsers returning users',data:{count:users.length,users:users.slice(0,3).map(u=>({email:u.email,name:u.name}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e)=>logWarn('[DEBUG] Fetch failed:',e));
      // #endregion

      // Cache users
      sessionStorage.setItem('cachedUsers', JSON.stringify(users));
      sessionStorage.setItem('cachedUsersTime', Date.now().toString());

      return users;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:84',message:'loadAllUsers error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      logError('Error loading users:', error);
      return [];
    }
  }

  /**
   * Load all scorecards from database
   */
  async loadScorecards(): Promise<Scorecard[]> {
    try {
      const { data, error } = await this.db
        .from('scorecards')
        .select(['id', 'name', 'table_name'])
        .eq('is_active', true)
        .order('name', { ascending: true })
        .execute<Scorecard[]>();

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        table_name: s.table_name,
        is_active: true
      }));
    } catch (error) {
      logError('Error loading scorecards:', error);
      return [];
    }
  }

  /**
   * Load audit assignments with date filtering
   */
  async loadAssignments(
    auditorEmail: string,
    period: PeriodDates
  ): Promise<Assignment[]> {
    try {
      let query = this.db
        .from('audit_assignments')
        .select(AUDIT_ASSIGNMENT_FIELDS)
        .eq('auditor_email', auditorEmail);

      // Apply date filters
      if (period.start) {
        query = query.gte('created_at', this.dhakaDateToUTCISO(period.start));
      }
      if (period.end) {
        query = query.lte('created_at', this.dhakaDateToUTCISO(period.end));
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .execute<Assignment[]>();

      if (error) throw error;

      return (data || []) as Assignment[];
    } catch (error) {
      logError('Error loading assignments:', error);
      return [];
    }
  }

  /**
   * Load team assignments (all auditors) for a period
   */
  async loadTeamAssignments(period: PeriodDates): Promise<{
    scheduled: Assignment[];
    completed: Assignment[];
  }> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:124',message:'loadTeamAssignments entry',data:{periodStart:period.start?.toISOString(),periodEnd:period.end?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      // Load scheduled assignments
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:130',message:'loadTeamAssignments querying scheduled',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const { data: scheduledData, error: scheduledError } = await this.db
        .from('audit_assignments')
        .select(AUDIT_ASSIGNMENT_FIELDS)
        .order('created_at', { ascending: false })
        .execute<Assignment[]>();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:136',message:'loadTeamAssignments scheduled result',data:{hasError:!!scheduledError,error:scheduledError?.message,count:scheduledData?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (scheduledError) throw scheduledError;

      // Filter by scheduled_date client-side
      const scheduled = (scheduledData || []).filter((assignment: any) => {
        const assignmentDate = this.getAssignmentDate(assignment);
        if (!assignmentDate) return false;
        return this.isDateInPeriod(assignmentDate, period);
      });

      // Load completed assignments
      let completedQuery = this.db
        .from('audit_assignments')
        .select(AUDIT_ASSIGNMENT_FIELDS)
        .eq('status', 'completed')
        .not('completed_at', 'is', null);

      if (period.start) {
        completedQuery = completedQuery.gte('completed_at', this.dhakaDateToUTCISO(period.start));
      }
      if (period.end) {
        completedQuery = completedQuery.lte('completed_at', this.dhakaDateToUTCISO(period.end));
      }

      const { data: completedData, error: completedError } = await completedQuery
        .order('completed_at', { ascending: false })
        .execute<Assignment[]>();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:159',message:'loadTeamAssignments completed result',data:{hasError:!!completedError,error:completedError?.message,completedCount:completedData?.length,scheduledCount:scheduled.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (completedError) throw completedError;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:165',message:'loadTeamAssignments returning',data:{scheduledCount:scheduled.length,completedCount:completedData?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      return {
        scheduled: scheduled as Assignment[],
        completed: (completedData || []) as Assignment[]
      };
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-repository.ts:170',message:'loadTeamAssignments error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      logError('Error loading team assignments:', error);
      return { scheduled: [], completed: [] };
    }
  }

  /**
   * Load audit data from all scorecard tables
   */
  async loadAuditData(
    period: PeriodDates,
    options?: {
      auditorEmail?: string;
      includeDuration?: boolean;
      includePassing?: boolean;
      includeReversals?: boolean;
    }
  ): Promise<{
    durations: AuditData[];
    passing: AuditData[];
    reversals: AuditData[];
  }> {
    try {
      // Get all audit tables
      const tables = await this.getAuditTables();

      const results = await Promise.all(
        tables.map(async (tableName) => {
          try {
            const queries: Promise<{ data: any; error: any }>[] = [];

            // Duration query
            if (options?.includeDuration) {
              let durationQuery = this.db
                .from(tableName)
                .select(['audit_duration', 'submitted_at', 'auditor_email'])
                .not('audit_duration', 'is', null);

              if (options.auditorEmail) {
                durationQuery = durationQuery.eq('auditor_email', options.auditorEmail);
              }

              if (period.start) {
                durationQuery = durationQuery.gte('submitted_at', this.dhakaDateToUTCISO(period.start));
              }
              if (period.end) {
                durationQuery = durationQuery.lte('submitted_at', this.dhakaDateToUTCISO(period.end));
              }

              queries.push(durationQuery.execute<AuditData[]>());
            }

            // Passing status query
            if (options?.includePassing) {
              let passingQuery = this.db
                .from(tableName)
                .select(['passing_status', 'submitted_at']);

              if (options.auditorEmail) {
                passingQuery = passingQuery.eq('auditor_email', options.auditorEmail);
              }

              if (period.start) {
                passingQuery = passingQuery.gte('submitted_at', this.dhakaDateToUTCISO(period.start));
              }
              if (period.end) {
                passingQuery = passingQuery.lte('submitted_at', this.dhakaDateToUTCISO(period.end));
              }

              queries.push(passingQuery.execute<AuditData[]>());
            }

            // Reversals query
            if (options?.includeReversals) {
              let reversalQuery = this.db
                .from(tableName)
                .select(['id', 'submitted_at'])
                .not('reversal_requested_at', 'is', null);

              if (options.auditorEmail) {
                reversalQuery = reversalQuery.eq('auditor_email', options.auditorEmail);
              }

              if (period.start) {
                reversalQuery = reversalQuery.gte('submitted_at', this.dhakaDateToUTCISO(period.start));
              }
              if (period.end) {
                reversalQuery = reversalQuery.lte('submitted_at', this.dhakaDateToUTCISO(period.end));
              }

              queries.push(reversalQuery.execute<AuditData[]>());
            }

            const queryResults = await Promise.all(queries);

            return {
              durations: queryResults[0]?.data || [],
              passing: queryResults[1]?.data || [],
              reversals: queryResults[2]?.data || []
            };
          } catch (err) {
            logWarn(`Error querying ${tableName}:`, err);
            return { durations: [], passing: [], reversals: [] };
          }
        })
      );

      // Aggregate results
      return {
        durations: results.flatMap(r => r.durations),
        passing: results.flatMap(r => r.passing),
        reversals: results.flatMap(r => r.reversals)
      };
    } catch (error) {
      logError('Error loading audit data:', error);
      return { durations: [], passing: [], reversals: [] };
    }
  }

  /**
   * Load hourly breakdown data
   */
  async loadHourlyBreakdown(
    period: PeriodDates,
    auditorEmails: string[]
  ): Promise<HourlyBreakdown[]> {
    try {
      const tables = await this.getAuditTables();
      const allAudits: AuditData[] = [];

      // Load audits from all tables
      for (const tableName of tables) {
        try {
          let query = this.db
            .from(tableName)
            .select(['submitted_at', 'auditor_email'])
            .not('submitted_at', 'is', null);

          if (period.start) {
            query = query.gte('submitted_at', this.dhakaDateToUTCISO(period.start));
          }
          if (period.end) {
            query = query.lte('submitted_at', this.dhakaDateToUTCISO(period.end));
          }

          const { data, error } = await query.execute<AuditData[]>();
          if (error) {
            // Skip tables without auditor_email column
            if (error.code === '42703' || error.code === 'PGRST116') {
              continue;
            }
            throw error;
          }

          if (data) {
            allAudits.push(...(data as AuditData[]));
          }
        } catch (err) {
          logWarn(`Error querying ${tableName} for hourly breakdown:`, err);
        }
      }

      // Group by hour
      const hourlyData: Record<string, Record<string, number>> = {};

      allAudits.forEach(audit => {
        if (!audit.submitted_at) return;

        const submittedDate = this.toDhakaTime(audit.submitted_at);
        const hour = submittedDate.getHours();
        const minutes = submittedDate.getMinutes();

        // Group by hour starting at :30
        let groupHour = hour;
        if (minutes < 30) {
          groupHour = hour - 1;
          if (groupHour < 0) groupHour = 23;
        }

        // Only include 9:30 to 21:30
        if (groupHour < 9 || groupHour > 21) return;

        const hourKey = `${groupHour.toString().padStart(2, '0')}:30`;
        const auditorEmail = audit.auditor_email || 'Unknown';

        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = {};
        }
        if (!hourlyData[hourKey][auditorEmail]) {
          hourlyData[hourKey][auditorEmail] = 0;
        }
        hourlyData[hourKey][auditorEmail]++;
      });

      // Convert to array
      const sortedHours: string[] = [];
      for (let h = 9; h <= 21; h++) {
        sortedHours.push(`${h.toString().padStart(2, '0')}:30`);
      }

      return sortedHours.map(hour => ({
        hour,
        total: Object.values(hourlyData[hour] || {}).reduce((sum, count) => sum + count, 0),
        byAuditor: hourlyData[hour] || {},
        isLunchBreak: hour === '14:30'
      }));
    } catch (error) {
      logError('Error loading hourly breakdown:', error);
      return [];
    }
  }

  /**
   * Get all audit table names
   */
  private async getAuditTables(): Promise<string[]> {
    try {
      // Try RPC first (Supabase-specific, access through adapter)
      try {
        // Access underlying Supabase client for RPC calls
        const supabaseClient = (this.db as any).client;
        if (supabaseClient && supabaseClient.rpc) {
          const { data, error } = await supabaseClient.rpc('get_audit_tables');
          if (!error && data && data.length > 0) {
            return data
              .filter((t: any) => t.table_name !== 'ai_analysis_results' && t.table_name !== 'calibration_results')
              .map((t: any) => t.table_name);
          }
        }
      } catch (rpcError) {
        logWarn('RPC get_audit_tables failed, using scorecard-based loading:', rpcError);
      }

      // Fallback to scorecards
      const scorecards = await this.loadScorecards();
      return scorecards.map(s => s.table_name).filter(Boolean);
    } catch (error) {
      logError('Error getting audit tables:', error);
      return [];
    }
  }

  // Helper methods for date/timezone handling
  private getAssignmentDate(assignment: any): Date | null {
    if (assignment.scheduled_date) {
      return window.parseDhakaDate?.(assignment.scheduled_date) || null;
    }
    if (assignment.created_at) {
      return window.toDhakaTime?.(assignment.created_at) || null;
    }
    return null;
  }

  private isDateInPeriod(date: Date, period: PeriodDates): boolean {
    if (!period.start && !period.end) return true;
    const dateStr = window.formatDhakaDateForInput?.(date) || '';
    const startStr = period.start ? window.formatDhakaDateForInput?.(period.start) : null;
    const endStr = period.end ? window.formatDhakaDateForInput?.(period.end) : null;
    return (!startStr || dateStr >= startStr) && (!endStr || dateStr <= endStr);
  }

  private dhakaDateToUTCISO(date: Date): string {
    return window.dhakaDateToUTCISO?.(date) || date.toISOString();
  }

  private toDhakaTime(utcString: string): Date {
    return window.toDhakaTime?.(utcString) || new Date(utcString);
  }
}

