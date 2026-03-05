# Security issues to address next

Prioritized list of remaining items from the security audit and [tech-feedback.md](tech-feedback.md).  
See [security-audit-report.md](security-audit-report.md) for full context.

---

## High priority (do first)

| # | Issue | What to do | Where |
|---|--------|------------|--------|
| ~~1~~ | ~~**AI data logging (PII in logs)**~~ | **Fixed.** Logs now redact emails, names, webhook URL, and n8n response body. Only IDs, counts, and non-PII metadata are logged. | `ai-audit-processor/index.ts`, `ai-audit-callback/index.ts` |
| 2 | **XSS via innerHTML** | **Partially addressed (safe pass).** Fixed: audit-editor-controller (feedbackText → escapeHtml/sanitizeHTML), bau-materics (day headers → escapeHtml), new-audit-form/new-create-audit (scoringTypeText → escapeHtml). Remainder: continue auditing 50+ files; use `escapeHtml()` or `safeSetHTML()` only for user/API-derived content. | See `docs/xss-audit-safe-fixes.md` |
| ~~3~~ | ~~**CORS in Edge Functions**~~ | Replace `Access-Control-Allow-Origin: *` with your app’s **Fixed.** Use `CORS_ALLOWED_ORIGINS` (comma-separated) in Supabase secrets; if unset, `*` is used. Set e.g. `https://your-app.com,https://localhost:3000`. | `ai-audit-processor/`, `ai-audit-callback/` |

---

## Medium priority (schedule next)

| # | Issue | What to do | Where |
|---|--------|------------|--------|
| 4 | **CSP (unsafe-inline / unsafe-eval)** | Tighten CSP: use nonces or hashes for inline scripts; remove or reduce `unsafe-inline` and `unsafe-eval`. | `src/server-commonjs.ts`, `api/index.ts` (Helmet config) |
| 5 | **Session expiration** | Define session lifetime; implement expiry or refresh; consider server-side session store if needed. | Auth/session flow (e.g. `auth-checker`, Supabase session, localStorage) |
| 6 | **File upload validation** | Validate by content/signature (magic bytes), not only MIME type; enforce allowed types and max size. | Profile/settings upload handlers, any endpoint accepting file uploads |
| 7 | **AI data privacy / compliance** | PII redaction before sending to LLM; DPA with provider; consent and privacy policy for AI processing. | AI pipeline, n8n, privacy policy / consent UI |

---

## Lower priority (address systematically)

| # | Issue | What to do |
|---|--------|------------|
| ~~8~~ | ~~**Weak password hashing**~~ | **Fixed.** Migration 043 applied via Supabase MCP (cqms-staging). Platform admin password stored with bcrypt. Set password: `npm run update-platform-admin-password -- "YourNewPassword"`. |
| ~~9~~ | ~~**Input length limits**~~ | **Fixed.** `INPUT_LIMITS.PAYLOAD_MAX_BYTES` (1MB); `express.json({ limit })` in server and api/index. Field limits in validation.ts. |
| ~~10~~ | ~~**Security event logging**~~ | **Fixed.** `login_failure` logged in auth middleware; `permission_change` already in permissions.routes; events in `security_events` table. |
| ~~11~~ | ~~**HTTPS enforcement**~~ | **Fixed.** HTTPS redirect middleware in production (x-forwarded-proto / req.secure); HSTS via Helmet. |
| ~~12~~ | ~~**Subresource Integrity (SRI)**~~ | **Addressed.** See `docs/sri-subresource-integrity.md` for how to add integrity hashes to third-party scripts. |
| 13 | **Supabase advisors** | Run Supabase security/performance advisors after schema changes; document RLS coverage. |

---

## Quick reference

- **Already done:** Path traversal, hardcoded n8n URL, npm audit, dev bypass default, AI data logging (PII redaction), CORS in Edge Functions (env-based), credentials handling, RLS, CSRF, rate limiting, security headers, error sanitization.
- **Next sprint focus:** XSS audit (#2), then CSP (#4) and session expiry (#5).
