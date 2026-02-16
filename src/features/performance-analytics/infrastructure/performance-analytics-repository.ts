/**
 * Performance Analytics Repository
 * Fetches audit and people data for aggregation
 */

import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import type {
  AuditRow,
  PersonRow,
  AggregationBucket,
  ErrorBucket,
  PerformanceFilters,
  PerformanceAnalyticsData,
  ChannelAggregate,
  AuditFrequencyDay,
  ErrorCountByDay
} from '../domain/types.js';

const AUDIT_SELECT =
  'id, employee_email, employee_name, average_score, passing_status, total_errors_count, critical_errors, significant_error, submitted_at, week, channel, country_of_employee';

/** Count as pass only if status contains "pass" and does NOT contain "not" (e.g. "Not Pass" is fail). */
function isPassingStatus(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase();
  return s.includes('pass') && !s.includes('not');
}

export class PerformanceAnalyticsRepository {
  /**
   * Get current user's role from people table
   */
  async getUserRole(email: string): Promise<{ role: string | null; isSuperAdmin: boolean }> {
    const supabase = await getAuthenticatedSupabase();
    const { data } = await supabase
      .from('people')
      .select('role')
      .ilike('email', email)
      .maybeSingle();
    const role = (data?.role as string) ?? null;
    const isSuperAdmin = role === 'Super Admin';
    return { role, isSuperAdmin };
  }

  /**
   * Get audit table names from RPC
   */
  async getAuditTableNames(): Promise<string[]> {
    const supabase = await getAuthenticatedSupabase();
    const { data, error } = await supabase.rpc('get_audit_tables');
    if (error || !Array.isArray(data)) return [];
    return (data as { table_name: string }[]).map((r) => r.table_name);
  }

  /**
   * Fetch audit rows from a single table with optional filters
   */
  async fetchAuditsFromTable(
    tableName: string,
    filters: PerformanceFilters,
    employeeEmail?: string | null
  ): Promise<AuditRow[]> {
    const supabase = await getAuthenticatedSupabase();
    let query = supabase
      .from(tableName)
      .select(AUDIT_SELECT)
      .order('submitted_at', { ascending: false })
      .limit(5000);

    if (employeeEmail) {
      query = query.ilike('employee_email', employeeEmail);
    }
    if (filters.startDate) {
      query = query.gte('submitted_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('submitted_at', filters.endDate);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }

    const { data, error } = await query;
    if (error) return [];
    const rows = (data ?? []) as AuditRow[];
    return rows.map((r) => ({ ...r, table_name: tableName }));
  }

  /**
   * Fetch from all audit tables and merge
   */
  async fetchAllAudits(
    filters: PerformanceFilters,
    employeeEmail?: string | null
  ): Promise<AuditRow[]> {
    const tables = await this.getAuditTableNames();
    const results = await Promise.all(
      tables.map((t) => this.fetchAuditsFromTable(t, filters, employeeEmail))
    );
    return results.flat();
  }

  /**
   * Fetch people: all if superAdmin, else single row for email
   */
  async fetchPeople(isSuperAdmin: boolean, userEmail: string | null): Promise<PersonRow[]> {
    const supabase = await getAuthenticatedSupabase();
    const select =
      'email, name, role, department, designation, team, team_supervisor, quality_mentor, channel, country, is_active, avatar_url';
    if (isSuperAdmin) {
      const { data } = await supabase
        .from('people')
        .select(select)
        .eq('is_active', true)
        .limit(2000);
      return (data ?? []) as PersonRow[];
    }
    if (!userEmail) return [];
    const { data } = await supabase
      .from('people')
      .select(select)
      .ilike('email', userEmail)
      .maybeSingle();
    return data ? [data as PersonRow] : [];
  }

  /**
   * Fetch avatar_url for all distinct emails that appear in audits (case-insensitive).
   * Returns a map of lowercase email -> avatar_url so the UI can show avatars for every agent.
   */
  async fetchAvatarByEmails(emails: string[]): Promise<Record<string, string | null>> {
    if (emails.length === 0) return {};
    const supabase = await getAuthenticatedSupabase();
    // Include both original and lowercase so .in('email', ...) matches DB regardless of casing
    const toFetch = Array.from(new Set(emails.flatMap((e) => (e ? [e, e.toLowerCase().trim()] : [])))).filter(Boolean);
    if (toFetch.length === 0) return {};
    const { data } = await supabase
      .from('people')
      .select('email, avatar_url')
      .in('email', toFetch.slice(0, 500));
    const out: Record<string, string | null> = {};
    for (const row of data ?? []) {
      const email = (row as { email?: string; avatar_url?: string | null }).email;
      const url = (row as { email?: string; avatar_url?: string | null }).avatar_url ?? null;
      if (email != null) out[email.toLowerCase()] = url;
    }
    return out;
  }

  /**
   * Fetch error counts by scorecard parameter name (parameter name = error_name from scorecard_perameters).
   * Counts audits in the filter period where feedback_<field_id> is non-null for each error parameter.
   */
  async fetchParameterErrorBreakdown(filters: PerformanceFilters): Promise<ErrorBucket[]> {
    const supabase = await getAuthenticatedSupabase();
    if (!filters.startDate || !filters.endDate) return [];

    const [scorecardsRes, paramsRes, tableNames] = await Promise.all([
      supabase.from('scorecards').select('id, table_name').not('table_name', 'is', null),
      supabase.from('scorecard_perameters').select('scorecard_id, field_id, error_name').eq('parameter_type', 'error').eq('is_active', true),
      this.getAuditTableNames()
    ]);

    const scorecards = (scorecardsRes.data ?? []) as { id: string; table_name: string }[];
    const params = (paramsRes.data ?? []) as { scorecard_id: string; field_id: string; error_name: string }[];
    const tableToScorecard = new Map(scorecards.map((s) => [s.table_name, s.id]));
    const paramsByScorecard = new Map<string, { field_id: string; error_name: string }[]>();
    for (const p of params) {
      const list = paramsByScorecard.get(p.scorecard_id) ?? [];
      list.push({ field_id: p.field_id, error_name: p.error_name || p.field_id });
      paramsByScorecard.set(p.scorecard_id, list);
    }

    const nameToCount = new Map<string, number>();

    for (const tableName of tableNames) {
      const scorecardId = tableToScorecard.get(tableName);
      if (!scorecardId) continue;
      const tableParams = paramsByScorecard.get(scorecardId);
      if (!tableParams || tableParams.length === 0) continue;

      const feedbackCols = tableParams.map((p) => `feedback_${p.field_id}`).join(', ');
      const selectStr = `submitted_at, ${feedbackCols}`;

      const { data: rows, error } = await supabase
        .from(tableName)
        .select(selectStr)
        .gte('submitted_at', filters.startDate)
        .lte('submitted_at', filters.endDate)
        .limit(10000);

      if (error) continue;

      const list = (rows ?? []) as Record<string, unknown>[];
      for (const p of tableParams) {
        const col = `feedback_${p.field_id}`;
        const count = list.filter((row) => {
          const v = row[col];
          if (v == null) return false;
          if (typeof v === 'string') return v.trim() !== '';
          if (Array.isArray(v)) return v.length > 0;
          return true;
        }).length;
        if (count > 0) {
          const name = p.error_name.trim() || p.field_id;
          nameToCount.set(name, (nameToCount.get(name) ?? 0) + count);
        }
      }
    }

    return Array.from(nameToCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Fetch parameter-wise error counts for a single agent (employee).
   * Same as fetchParameterErrorBreakdown but filtered by employee_email.
   */
  async fetchParameterErrorBreakdownForAgent(
    filters: PerformanceFilters,
    employeeEmail: string
  ): Promise<ErrorBucket[]> {
    if (!filters.startDate || !filters.endDate || !employeeEmail?.trim()) return [];

    const supabase = await getAuthenticatedSupabase();
    const [scorecardsRes, paramsRes, tableNames] = await Promise.all([
      supabase.from('scorecards').select('id, table_name').not('table_name', 'is', null),
      supabase.from('scorecard_perameters').select('scorecard_id, field_id, error_name').eq('parameter_type', 'error').eq('is_active', true),
      this.getAuditTableNames()
    ]);

    const scorecards = (scorecardsRes.data ?? []) as { id: string; table_name: string }[];
    const params = (paramsRes.data ?? []) as { scorecard_id: string; field_id: string; error_name: string }[];
    const tableToScorecard = new Map(scorecards.map((s) => [s.table_name, s.id]));
    const paramsByScorecard = new Map<string, { field_id: string; error_name: string }[]>();
    for (const p of params) {
      const list = paramsByScorecard.get(p.scorecard_id) ?? [];
      list.push({ field_id: p.field_id, error_name: p.error_name || p.field_id });
      paramsByScorecard.set(p.scorecard_id, list);
    }

    const nameToCount = new Map<string, number>();

    for (const tableName of tableNames) {
      const scorecardId = tableToScorecard.get(tableName);
      if (!scorecardId) continue;
      const tableParams = paramsByScorecard.get(scorecardId);
      if (!tableParams || tableParams.length === 0) continue;

      const feedbackCols = tableParams.map((p) => `feedback_${p.field_id}`).join(', ');
      const selectStr = `submitted_at, ${feedbackCols}`;

      let query = supabase
        .from(tableName)
        .select(selectStr)
        .gte('submitted_at', filters.startDate)
        .lte('submitted_at', filters.endDate)
        .ilike('employee_email', employeeEmail.trim())
        .limit(10000);

      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }

      const { data: rows, error } = await query;
      if (error) continue;

      const list = (rows ?? []) as Record<string, unknown>[];
      for (const p of tableParams) {
        const col = `feedback_${p.field_id}`;
        const count = list.filter((row) => {
          const v = row[col];
          if (v == null) return false;
          if (typeof v === 'string') return v.trim() !== '';
          if (Array.isArray(v)) return v.length > 0;
          return true;
        }).length;
        if (count > 0) {
          const name = p.error_name.trim() || p.field_id;
          nameToCount.set(name, (nameToCount.get(name) ?? 0) + count);
        }
      }
    }

    return Array.from(nameToCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Build full analytics data: aggregate by individual, team, role, designation, supervisor, quality mentor; error breakdown; score trend
   */
  async getAnalytics(
    userEmail: string | null,
    filters: PerformanceFilters
  ): Promise<PerformanceAnalyticsData> {
    const { role, isSuperAdmin } = userEmail
      ? await this.getUserRole(userEmail)
      : { role: null, isSuperAdmin: false };
    const employeeFilter = isSuperAdmin ? undefined : userEmail ?? undefined;

    const [rawAudits, people] = await Promise.all([
      this.fetchAllAudits(filters, employeeFilter),
      this.fetchPeople(isSuperAdmin, userEmail)
    ]);

    const byIndividual = this.aggregateBy(rawAudits, (r) => r.employee_email ?? 'Unknown', (r) => r.employee_name ?? r.employee_email ?? 'Unknown');
    const byTeam = this.aggregateByKey(rawAudits, people, 'team', 'team');
    const byRole = this.aggregateByKey(rawAudits, people, 'role', 'role');
    const byDesignation = this.aggregateByKey(rawAudits, people, 'designation', 'designation');
    const bySupervisor = this.aggregateByKey(rawAudits, people, 'team_supervisor', 'Supervisor');
    const byQualityMentor = this.aggregateByKey(rawAudits, people, 'quality_mentor', 'Quality Mentor');

    const errorBreakdown = this.buildErrorBreakdown(rawAudits);
    const parameterErrorBreakdown = await this.fetchParameterErrorBreakdown(filters);
    const scoreTrend = this.buildScoreTrend(rawAudits);
    const byChannel = this.buildChannelAggregates(rawAudits);
    const auditFrequencyByDay = this.buildAuditFrequencyByDay(rawAudits);
    const errorCountByDay = this.buildErrorCountByDay(rawAudits);

    const agentEmails = Array.from(
      new Set(
        (rawAudits || [])
          .map((r) => (r.employee_email || '').trim())
          .filter(Boolean)
      )
    );
    const peopleAvatarByEmail = await this.fetchAvatarByEmails(agentEmails);

    return {
      isSuperAdmin,
      userEmail,
      userRole: role,
      byIndividual,
      byTeam,
      byRole,
      byDesignation,
      bySupervisor,
      byQualityMentor,
      errorBreakdown,
      parameterErrorBreakdown: parameterErrorBreakdown.length > 0 ? parameterErrorBreakdown : undefined,
      scoreTrend,
      rawAudits,
      people,
      peopleAvatarByEmail,
      byChannel,
      auditFrequencyByDay,
      errorCountByDay
    };
  }

  private buildChannelAggregates(audits: AuditRow[]): ChannelAggregate[] {
    const map = new Map<string, { total: number; pass: number }>();
    for (const r of audits) {
      const ch = (r.channel || '').trim() || 'Unknown';
      const pass = isPassingStatus(r.passing_status) ? 1 : 0;
      const entry = map.get(ch) ?? { total: 0, pass: 0 };
      entry.total += 1;
      entry.pass += pass;
      map.set(ch, entry);
    }
    return Array.from(map.entries()).map(([channel, v]) => ({
      channel,
      totalAudits: v.total,
      passCount: v.pass,
      passRate: v.total ? (v.pass / v.total) * 100 : 0
    }));
  }

  private buildAuditFrequencyByDay(audits: AuditRow[]): AuditFrequencyDay[] {
    const map = new Map<string, number>();
    for (const r of audits) {
      if (!r.submitted_at) continue;
      const date = String(r.submitted_at).slice(0, 10);
      map.set(date, (map.get(date) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private buildErrorCountByDay(audits: AuditRow[]): ErrorCountByDay[] {
    const map = new Map<string, number>();
    for (const r of audits) {
      if (!r.submitted_at) continue;
      const date = String(r.submitted_at).slice(0, 10);
      const n = typeof r.total_errors_count === 'number' ? r.total_errors_count : parseInt(String(r.total_errors_count ?? 0), 10) || 0;
      map.set(date, (map.get(date) ?? 0) + n);
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private aggregateBy(
    audits: AuditRow[],
    keyFn: (r: AuditRow) => string,
    labelFn: (r: AuditRow) => string
  ): AggregationBucket[] {
    const map = new Map<string, { label: string; scores: number[]; pass: number; total: number; errors: number }>();
    for (const r of audits) {
      const k = keyFn(r);
      if (!k) continue;
      const label = labelFn(r);
      const score = typeof r.average_score === 'number' ? r.average_score : parseFloat(String(r.average_score ?? 0)) || 0;
      const pass = isPassingStatus(r.passing_status) ? 1 : 0;
      const errors = typeof r.total_errors_count === 'number' ? r.total_errors_count : parseInt(String(r.total_errors_count ?? 0), 10) || 0;
      let entry = map.get(k);
      if (!entry) {
        entry = { label, scores: [], pass: 0, total: 0, errors: 0 };
        map.set(k, entry);
      }
      entry.scores.push(score);
      entry.pass += pass;
      entry.total += 1;
      entry.errors += errors;
    }
    return Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: v.label,
      count: v.total,
      avgScore: v.scores.length ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length : 0,
      passCount: v.pass,
      totalCount: v.total,
      passRate: v.total ? (v.pass / v.total) * 100 : 0,
      totalErrors: v.errors
    }));
  }

  private aggregateByKey(
    audits: AuditRow[],
    people: PersonRow[],
    key: keyof PersonRow,
    fallbackLabel: string
  ): AggregationBucket[] {
    const emailToKey = new Map<string, string>();
    const emailToLabel = new Map<string, string>();
    for (const p of people) {
      const email = (p.email || '').trim().toLowerCase();
      if (!email) continue;
      const val = p[key];
      const str = val != null ? String(val).trim() : '';
      emailToKey.set(email, str || 'Unknown');
      emailToLabel.set(email, str || fallbackLabel);
    }
    const bucketMap = new Map<string, { scores: number[]; pass: number; total: number; errors: number }>();
    for (const r of audits) {
      const email = (r.employee_email || '').trim().toLowerCase();
      const k = email ? emailToKey.get(email) ?? 'Unknown' : 'Unknown';
      const label = email ? emailToLabel.get(email) ?? k : 'Unknown';
      const score = typeof r.average_score === 'number' ? r.average_score : parseFloat(String(r.average_score ?? 0)) || 0;
      const pass = isPassingStatus(r.passing_status) ? 1 : 0;
      const errors = typeof r.total_errors_count === 'number' ? r.total_errors_count : parseInt(String(r.total_errors_count ?? 0), 10) || 0;
      let entry = bucketMap.get(k);
      if (!entry) {
        entry = { scores: [], pass: 0, total: 0, errors: 0 };
        bucketMap.set(k, entry);
      }
      entry.scores.push(score);
      entry.pass += pass;
      entry.total += 1;
      entry.errors += errors;
    }
    return Array.from(bucketMap.entries()).map(([key, v]) => ({
      key,
      label: key,
      count: v.total,
      avgScore: v.scores.length ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length : 0,
      passCount: v.pass,
      totalCount: v.total,
      passRate: v.total ? (v.pass / v.total) * 100 : 0,
      totalErrors: v.errors
    }));
  }

  private buildErrorBreakdown(audits: AuditRow[]): ErrorBucket[] {
    const countByError: Record<string, number> = {};
    for (const r of audits) {
      const n = typeof r.total_errors_count === 'number' ? r.total_errors_count : parseInt(String(r.total_errors_count ?? 0), 10) || 0;
      if (n > 0) {
        countByError['Total errors (audits with ≥1)'] = (countByError['Total errors (audits with ≥1)'] ?? 0) + 1;
      }
      const crit = typeof r.critical_errors === 'number' ? r.critical_errors : parseInt(String(r.critical_errors ?? 0), 10) || 0;
      if (crit > 0) {
        countByError['Critical errors'] = (countByError['Critical errors'] ?? 0) + crit;
      }
      const sig = typeof r.significant_error === 'number' ? r.significant_error : parseInt(String(r.significant_error ?? 0), 10) || 0;
      if (sig > 0) {
        countByError['Significant errors'] = (countByError['Significant errors'] ?? 0) + sig;
      }
    }
    return Object.entries(countByError).map(([name, count]) => ({ name, count }));
  }

  private buildScoreTrend(audits: AuditRow[]): PerformanceAnalyticsData['scoreTrend'] {
    const byWeek = new Map<number, { scores: number[]; pass: number }>();
    for (const r of audits) {
      const week = r.week ?? 0;
      const score = typeof r.average_score === 'number' ? r.average_score : parseFloat(String(r.average_score ?? 0)) || 0;
      const pass = isPassingStatus(r.passing_status) ? 1 : 0;
      let entry = byWeek.get(week);
      if (!entry) {
        entry = { scores: [], pass: 0 };
        byWeek.set(week, entry);
      }
      entry.scores.push(score);
      entry.pass += pass;
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, v]) => ({
        period: `Week ${week}`,
        avgScore: v.scores.length ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length : 0,
        count: v.scores.length,
        passRate: v.scores.length ? (v.pass / v.scores.length) * 100 : 0
      }));
  }
}
