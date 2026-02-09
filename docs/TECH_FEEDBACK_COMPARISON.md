# tech_feedback.md — Comparison: Addressed vs N/A vs Left

This table maps each finding in `src/tech_feedback.md` (26 numbered items) to current status after recent security and architecture changes.

| # | Finding | Status | Notes |
|---|---------|--------|-------|
| 1 | Exposed Credentials in Repository | **Left** | `.env` and `cqms.env`, `env-config.js` in .gitignore; use .env for secrets; rotate any previously committed secrets. |
| 2 | AI Data Logging | **N/A** | Supabase Edge Functions removed; no Supabase logs for AI data. |
| 3 | Unauthenticated External Webhook | **N/A** | Supabase Edge Functions removed. |
| 4 | Weak Password Hashing (SHA-256) | **Addressed** | Password handling removed; auth is Google OAuth only. |
| 5 | SQL Injection via Table Names | **Left** | Server uses fixed table names in most routes; scorecard/table names from client still need server-side whitelist where dynamic. |
| 6 | No Rate Limiting on Login | **N/A** | Login is Google OAuth; rate limiting on Google. Auth API has rate limiter (e.g. `/api/users`). |
| 7 | Client-Side Authorization Only | **Addressed** | Server-side: `verifyAuth`, `requirePermission`, `requireRole` on API routes; permission checks from DB. |
| 8 | No RLS Enabled in Supabase | **Left** | RLS scripts exist (`apply-rls.ps1`, `apply-rls.sh`, `apply-rls-migration.ts`); policies must be applied in Supabase project. |
| 9 | AI Data Privacy & Compliance | **Left** | Depends on current AI/n8n usage; DPAs and redaction are operational/legal. |
| 10 | CORS Misconfiguration | **N/A** | Referred to Supabase Edge Functions; those are removed. |
| 11 | XSS via innerHTML | **Addressed (partial)** | Sanitization/escape in key flows (e.g. new-audit-form, scorecards, home, performance); many innerHTML usages remain—continue systematically. |
| 12 | No CSRF Protection | **Addressed** | CSRF middleware on `/api`; token via `GET /api/csrf`; api-client sends `X-CSRF-Token` for POST/PUT/DELETE/PATCH. |
| 13 | No Session Expiration | **Addressed** | Supabase JWT has `expires_at`; `refreshSession()` on expiry and on 401; session warning UX. |
| 14 | Weak File Upload Validation | **Left** | Content/signature checks still needed where uploads are accepted. |
| 15 | Missing Security Headers | **Addressed** | Helmet: CSP, frameAncestors, formAction, referrerPolicy; HSTS in production; Permissions-Policy. |
| 16 | No Input Length Limits | **Addressed** | `INPUT_LIMITS` + `sanitizeString(..., maxLength)` on API routes (users, permissions, notifications, admin, google-meet, cache-management) and audit-form channelFilter. |
| 17 | Weak Password Policy | **N/A** | Google-only auth; no app passwords. |
| 18 | No Security Event Logging | **Addressed** | Login events (POST /api/auth/login-event), permission changes (logSecurityEvent in permissions.routes), API access (apiAccessAudit middleware → api_access_logs). |
| 19 | Information Disclosure in Errors | **Addressed** | Central handler + sanitizeErrorMessage(); routes use it so table/column names never sent to client in production. |
| 20 | No HTTPS Enforcement | **Addressed** | HSTS in production (api/index.ts, server-commonjs). |
| 21 | Outdated Dependencies | **Left** | Run `npm audit` / Dependabot regularly. |
| 22 | No API Rate Limiting | **Addressed** | General API rate limit + stricter auth rate limit on api/index.ts (and server-commonjs). |
| 23 | Session Fixation | **Addressed** | New session from OAuth (detectSessionInUrl); post-login `refreshSession()` in auth-oauth.ts. |
| 24 | Insecure Direct Object References | **Left** | Predictable IDs; add authorization checks per resource where needed. |
| 25 | No Subresource Integrity | **Left** | `generate-sri-hashes.js` exists; SRI not consistently applied to third-party scripts. |
| 26 | Client-Side Business Logic | **Left** | Architecture; sensitive logic should be validated on server. |

**Summary**

- **Addressed:** 11 full + 1 partial (4, 7, 11 partial, 12, 13, 15, 16, 18, 19, 20, 22, 23)
- **N/A:** 5 (2, 3, 6, 10, 17)
- **Left:** 9 (1, 5, 8, 9, 14, 21, 24, 25, 26)

*Last updated: Feb 2025. Includes: .gitignore (cqms.env, env-config.js), session/token regeneration, input length limits, security event logging, error message sanitization, CSRF, headers, HSTS, rate limiting. security_events table applied on Supabase (cqms-staging).*
