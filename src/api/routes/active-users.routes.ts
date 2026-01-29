/**
 * Active Users Dashboard API
 *
 * Provides server-side aggregated activity stats used by:
 * - /src/features/active-users-dashboard.html
 *
 * Security:
 * - verifyAuth required
 * - requirePermission('active-users-dashboard', 'page') so access can be managed via DB rules
 */

import { Router, Response } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requirePermissionOrRole } from '../middleware/permission.middleware.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ActiveUsersAPI');
const router = Router();

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

function parseDays(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(1, Math.floor(n)));
}

function isValidISODateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toStartOfDayISO(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  return d.toISOString();
}

function toEndOfDayISO(dateOnly: string): string {
  const d = new Date(`${dateOnly}T23:59:59.999Z`);
  return d.toISOString();
}

type ActivityUserRow = {
  email: string;
  name: string | null;
  role: string | null;
  department: string | null;
  is_active: boolean | null;
  last_login: string | null;   // mapped from users.last_sign_in_at when available
  login_count: number | null;  // mapped from users.sign_in_count when available
  audit_assignment_count: number;
  audit_submission_count: number;
  acknowledgement_count: number;
  rating_count: number;
  reversal_count: number;
  calibration_count: number;
  ai_audit_count: number;
  most_recent_activity: string | null;
  total_activity_count: number;
  activity_status: string;
};

function getActivityStatus(mostRecentIso: string | null): string {
  if (!mostRecentIso) return 'Never Active';
  const mostRecent = new Date(mostRecentIso);
  if (!Number.isFinite(mostRecent.getTime())) return 'Never Active';
  const daysSince = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= 7) return 'Very Active (7 days)';
  if (daysSince <= 30) return 'Active (30 days)';
  if (daysSince <= 90) return 'Moderately Active (90 days)';
  return 'Inactive (>90 days)';
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

/**
 * GET /api/active-users/users?days=30
 * Returns aggregated activity per user for the last N days.
 */
router.get(
  '/users',
  verifyAuth,
  requirePermissionOrRole('active-users-dashboard', 'page', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const days = parseDays(req.query.days);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    try {
      const supabase = getServerSupabase();

      const [
        usersRes,
        peopleRes,
        assignmentsRes,
        auditsRes,
        acknowledgementsRes,
        ratingsRes,
        reversalsRes,
        calibrationsRes,
        aiAuditsRes,
      ] = await Promise.all([
        supabase
          .from('users')
          .select('email, last_sign_in_at, sign_in_count')
          .order('email', { ascending: true }),
        supabase
          .from('people')
          .select('email, name, role, department')
          .order('name', { ascending: true }),
        supabase
          .from('audit_assignments')
          .select('employee_email, created_at')
          .gte('created_at', cutoffIso),
        supabase
          .from('fnchat_cfd_v4_0_v2')
          .select('employee_email, submitted_at')
          .gte('submitted_at', cutoffIso),
        supabase
          .from('fnchat_cfd_v4_0_v2')
          .select('employee_email, acknowledgement_status_updated_at')
          .gte('acknowledgement_status_updated_at', cutoffIso)
          .not('acknowledgement_status_updated_at', 'is', null),
        supabase
          .from('fnchat_cfd_v4_0_v2')
          .select('employee_email, audit_rated_at')
          .gte('audit_rated_at', cutoffIso)
          .not('audit_rated_at', 'is', null),
        supabase
          .from('reversal_requests')
          .select('requested_by_email, requested_at')
          .gte('requested_at', cutoffIso),
        supabase
          .from('calibration_results')
          .select('participant_email, submitted_at')
          .gte('submitted_at', cutoffIso),
        supabase
          .from('ai_audit_results')
          .select('employee_email, created_at')
          .gte('created_at', cutoffIso),
      ]);

      const anyError =
        usersRes.error ||
        peopleRes.error ||
        assignmentsRes.error ||
        auditsRes.error ||
        acknowledgementsRes.error ||
        ratingsRes.error ||
        reversalsRes.error ||
        calibrationsRes.error ||
        aiAuditsRes.error;

      if (anyError) {
        const msg =
          anyError?.message ||
          'Failed to load active user data';
        logger.error('Active users query error', { message: msg });
        res.status(500).json({ error: 'Internal Server Error', message: msg });
        return;
      }

      const users = (usersRes.data ?? []) as Array<{
        email: string;
        last_sign_in_at: string | null;
        sign_in_count: string | null;
      }>;

      const people = (peopleRes.data ?? []) as Array<{
        email: string;
        name: string | null;
        role: string | null;
        department: string | null;
      }>;

      const peopleByEmail: Record<string, { name: string | null; role: string | null; department: string | null }> = {};
      people.forEach((p) => {
        if (!p.email) return;
        peopleByEmail[p.email] = {
          name: p.name ?? null,
          role: p.role ?? null,
          department: p.department ?? null,
        };
      });

      const usersByEmail: Record<string, { last_login: string | null; login_count: number | null }> = {};
      users.forEach((u) => {
        if (!u.email) return;
        const lastLoginIso = u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null;
        const loginCount = u.sign_in_count != null ? parseInt(String(u.sign_in_count), 10) : null;
        usersByEmail[u.email] = {
          last_login: lastLoginIso,
          login_count: Number.isFinite(loginCount as number) ? (loginCount as number) : null,
        };
      });

      const byEmail: Record<string, ActivityUserRow> = {};
      // Prefer people list as source of truth for "who is a user" in CQMS.
      // Include users table emails too (in case people is incomplete).
      const allEmails = new Set<string>();
      people.forEach((p) => p.email && allEmails.add(p.email));
      users.forEach((u) => u.email && allEmails.add(u.email));

      for (const email of Array.from(allEmails)) {
        const p = peopleByEmail[email];
        const u = usersByEmail[email];
        const lastLoginIso = u?.last_login ?? null;
        byEmail[email] = {
          email,
          name: p?.name ?? null,
          role: p?.role ?? null,
          department: p?.department ?? null,
          // CQMS does not guarantee an is_active flag in people/users. Default to true.
          is_active: true,
          last_login: lastLoginIso,
          login_count: u?.login_count ?? null,
          audit_assignment_count: 0,
          audit_submission_count: 0,
          acknowledgement_count: 0,
          rating_count: 0,
          reversal_count: 0,
          calibration_count: 0,
          ai_audit_count: 0,
          most_recent_activity: lastLoginIso,
          total_activity_count: 0,
          activity_status: 'Never Active',
        };
      }

      (assignmentsRes.data ?? []).forEach((row: any) => {
        const email = row.employee_email as string | undefined;
        const createdAt = row.created_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].audit_assignment_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, createdAt ?? null);
      });

      (auditsRes.data ?? []).forEach((row: any) => {
        const email = row.employee_email as string | undefined;
        const submittedAt = row.submitted_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].audit_submission_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, submittedAt ?? null);
      });

      (acknowledgementsRes.data ?? []).forEach((row: any) => {
        const email = row.employee_email as string | undefined;
        const ts = row.acknowledgement_status_updated_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].acknowledgement_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, ts ?? null);
      });

      (ratingsRes.data ?? []).forEach((row: any) => {
        const email = row.employee_email as string | undefined;
        const ts = row.audit_rated_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].rating_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, ts ?? null);
      });

      (reversalsRes.data ?? []).forEach((row: any) => {
        const email = row.requested_by_email as string | undefined;
        const ts = row.requested_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].reversal_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, ts ?? null);
      });

      (calibrationsRes.data ?? []).forEach((row: any) => {
        const email = row.participant_email as string | undefined;
        const ts = row.submitted_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].calibration_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, ts ?? null);
      });

      (aiAuditsRes.data ?? []).forEach((row: any) => {
        const email = row.employee_email as string | undefined;
        const ts = row.created_at as string | undefined;
        if (!email || !byEmail[email]) return;
        byEmail[email].ai_audit_count += 1;
        byEmail[email].most_recent_activity = maxIso(byEmail[email].most_recent_activity, ts ?? null);
      });

      const result: ActivityUserRow[] = Object.values(byEmail).map((u) => {
        const total =
          u.audit_assignment_count +
          u.audit_submission_count +
          u.acknowledgement_count +
          u.rating_count +
          u.reversal_count +
          u.calibration_count +
          u.ai_audit_count;
        const mostRecent = u.most_recent_activity;
        return {
          ...u,
          total_activity_count: total,
          most_recent_activity: mostRecent,
          activity_status: getActivityStatus(mostRecent),
        };
      });

      // Sort newest activity first (matches dashboard default sort)
      result.sort((a, b) => new Date(b.most_recent_activity || 0).getTime() - new Date(a.most_recent_activity || 0).getTime());

      res.json({
        days,
        cutoff: cutoffIso,
        users: result,
      });
    } catch (err: unknown) {
      logger.error('Active users endpoint error', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load active users' });
    }
  }
);

/**
 * GET /api/active-users/date-activity?date=YYYY-MM-DD
 * Returns activity summary for a specific UTC date.
 */
router.get(
  '/date-activity',
  verifyAuth,
  requirePermissionOrRole('active-users-dashboard', 'page', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const date = String(req.query.date || '').trim();
    if (!isValidISODateOnly(date)) {
      res.status(400).json({ error: 'Bad Request', message: 'date must be YYYY-MM-DD' });
      return;
    }

    const startIso = toStartOfDayISO(date);
    const endIso = toEndOfDayISO(date);

    try {
      const supabase = getServerSupabase();

      const [
        assignmentsRes,
        auditsRes,
        reversalsRes,
        calibrationsRes,
        aiAuditsRes,
        acknowledgementsRes,
        ratingsRes,
      ] = await Promise.all([
        supabase
          .from('audit_assignments')
          .select('employee_email')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase
          .from('fnchat_cfd_v4_0_v2')
          .select('employee_email')
          .gte('submitted_at', startIso)
          .lte('submitted_at', endIso),
        supabase
          .from('reversal_requests')
          .select('requested_by_email')
          .gte('requested_at', startIso)
          .lte('requested_at', endIso),
        supabase
          .from('calibration_results')
          .select('participant_email')
          .gte('submitted_at', startIso)
          .lte('submitted_at', endIso),
        supabase
          .from('ai_audit_results')
          .select('employee_email')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase
          .from('fnchat_cfd_v4_0_v2')
          .select('employee_email')
          .gte('acknowledgement_status_updated_at', startIso)
          .lte('acknowledgement_status_updated_at', endIso)
          .not('acknowledgement_status_updated_at', 'is', null),
        supabase
          .from('fnchat_cfd_v4_0_v2')
          .select('employee_email')
          .gte('audit_rated_at', startIso)
          .lte('audit_rated_at', endIso)
          .not('audit_rated_at', 'is', null),
      ]);

      const anyError =
        assignmentsRes.error ||
        auditsRes.error ||
        reversalsRes.error ||
        calibrationsRes.error ||
        aiAuditsRes.error ||
        acknowledgementsRes.error ||
        ratingsRes.error;

      if (anyError) {
        const msg = anyError?.message || 'Failed to load date activity';
        logger.error('Date activity query error', { message: msg, date });
        res.status(500).json({ error: 'Internal Server Error', message: msg });
        return;
      }

      const userActivities: Record<string, { activities: string[] }> = {};
      const activityCounts = {
        assignments: 0,
        submissions: 0,
        reversals: 0,
        calibrations: 0,
        aiAudits: 0,
        acknowledgements: 0,
        ratings: 0,
      };

      (assignmentsRes.data ?? []).forEach((r: any) => {
        const email = r.employee_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('Audit Assignment');
        activityCounts.assignments += 1;
      });

      (auditsRes.data ?? []).forEach((r: any) => {
        const email = r.employee_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('Audit Submission');
        activityCounts.submissions += 1;
      });

      (reversalsRes.data ?? []).forEach((r: any) => {
        const email = r.requested_by_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('Reversal Request');
        activityCounts.reversals += 1;
      });

      (calibrationsRes.data ?? []).forEach((r: any) => {
        const email = r.participant_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('Calibration');
        activityCounts.calibrations += 1;
      });

      (aiAuditsRes.data ?? []).forEach((r: any) => {
        const email = r.employee_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('AI Audit');
        activityCounts.aiAudits += 1;
      });

      (acknowledgementsRes.data ?? []).forEach((r: any) => {
        const email = r.employee_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('Acknowledgement');
        activityCounts.acknowledgements += 1;
      });

      (ratingsRes.data ?? []).forEach((r: any) => {
        const email = r.employee_email as string | undefined;
        if (!email) return;
        userActivities[email] = userActivities[email] || { activities: [] };
        userActivities[email].activities.push('Rating');
        activityCounts.ratings += 1;
      });

      const activeUserEmails = Object.keys(userActivities);
      const totalActivities = Object.values(activityCounts).reduce((sum, n) => sum + n, 0);

      // Attach user details (best-effort)
      let userDetails: Record<string, { email: string; name: string | null; role: string | null; department: string | null }> = {};
      if (activeUserEmails.length > 0) {
        // Prefer people table for profile fields
        const { data: people, error: peopleError } = await supabase
          .from('people')
          .select('email, name, role, department')
          .in('email', activeUserEmails);
        if (!peopleError && people) {
          people.forEach((p: any) => {
            userDetails[p.email] = {
              email: p.email,
              name: p.name ?? null,
              role: p.role ?? null,
              department: p.department ?? null,
            };
          });
        }
      }

      const usersList = activeUserEmails
        .map((email) => {
          const details = userDetails[email] ?? { email, name: null, role: null, department: null };
          const activities = userActivities[email].activities;
          const summary: Record<string, number> = {};
          activities.forEach((a) => {
            summary[a] = (summary[a] || 0) + 1;
          });
          return {
            email: details.email,
            name: details.name,
            role: details.role,
            department: details.department,
            activityCount: activities.length,
            activitySummary: summary,
          };
        })
        .sort((a, b) => b.activityCount - a.activityCount);

      res.json({
        date,
        start: startIso,
        end: endIso,
        activeUsers: activeUserEmails.length,
        totalActivities,
        activityCounts,
        users: usersList,
      });
    } catch (err: unknown) {
      logger.error('Date activity endpoint error', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load date activity' });
    }
  }
);

export default router;

