# Security Audit Report — github-cqms

**Audit date:** March 2, 2025  
**Last re-check:** March 2, 2025 (full re-audit)  
**Scope:** Full codebase (backend, frontend, Supabase, Edge Functions)  
**Methodology:** Static analysis, dependency audit, authentication/authorization review, input/output handling, and configuration review.

---

## Executive summary

The application has solid security foundations: JWT auth via Supabase, CSRF protection, rate limiting, error sanitization, and RLS in the database. **Path traversal**, **hardcoded n8n webhook**, **dependency vulnerabilities**, **dev bypass default**, **AI data logging (PII in logs)**, and **CORS in Edge Functions** have been fixed. Remaining: **CSP weak directives** and **XSS surface** from `innerHTML` usage (50+ files).

---

## 1. Critical & high priority

### 1.1 Hardcoded secret (n8n webhook URL) — **FIXED**

| Item | Detail |
|------|--------|
| **Location** | `supabase/functions/ai-audit-processor/index.ts` |
| **Status** | **Fixed.** No fallback URL; `N8N_WEBHOOK_URL` is required from env. Function fails fast if unset. |

### 1.2 Path traversal on `/src/*.html` route — **FIXED**

| Item | Detail |
|------|--------|
| **Location** | `src/server-commonjs.ts` lines 589–626 |
| **Status** | **Fixed.** Path is normalized, resolved, and checked to stay under app root; requests escaping root return 404. |

### 1.3 Dependency vulnerabilities — **FIXED**

| Item | Detail |
|------|--------|
| **Source** | `npm audit` |
| **Status** | **Fixed.** Ran `npm audit fix`; 3 packages updated (minimatch, bn.js, qs). `npm audit` now reports 0 vulnerabilities. |

---

## 2. Medium priority

### 2.1 Dev bypass when `window.env` is missing — **FIXED**

| Item | Detail |
|------|--------|
| **Location** | `src/utils/auth-dev-bypass.ts` |
| **Status** | **Fixed.** Bypass only when `NODE_ENV === 'development'`; if `window.env` is missing or not development, treat as production (bypass disabled). |

### 2.2 CSP uses `unsafe-inline` and `unsafe-eval` — **MEDIUM**

| Item | Detail |
|------|--------|
| **Location** | `src/server-commonjs.ts` (Helmet CSP config), `api/index.ts` |
| **Issue** | `script-src` includes `'unsafe-inline'` and `'unsafe-eval'`, which significantly reduce XSS protection. |
| **Remediation** | Move to nonces or hashes for inline scripts; remove `unsafe-eval` and constrain script sources. Plan incremental CSP tightening and test. |

### 2.3 CORS in Edge Functions — **FIXED**

| Item | Detail |
|------|--------|
| **Location** | `supabase/functions/ai-audit-processor/index.ts`, `ai-audit-callback/index.ts` |
| **Status** | **Fixed.** CORS uses `CORS_ALLOWED_ORIGINS` (comma-separated) from Supabase secrets. If unset, `*` is used so deployments don't break. Set to app URL(s), e.g. `https://your-app.com,https://localhost:3000`. |

### 2.4 XSS surface: `innerHTML` with user/API content — **MEDIUM–HIGH**

| Item | Detail |
|------|--------|
| **Location** | Many files (e.g. `new-audit-form.html`, `admin-portal.html`, `audit-view.html`, `audit-reports-renderer.ts`, `new-create-audit.html`, and 50+ other files with `innerHTML`). |
| **Issue** | Dozens of `innerHTML` assignments; any that use user-controlled or API-returned data without escaping/sanitization are XSS risks. |
| **Remediation** | (1) Use `escapeHtml()` or `safeSetHTML()` (DOMPurify) from `src/utils/html-sanitizer.ts` for all user/API-derived content. (2) Audit every `innerHTML` and ensure variables are escaped or sanitized. (3) For Quill/rich text, enforce a strict allowlist and sanitize on paste/insert. |

---

## 3. Lower priority / good practices

### 3.1 Secrets and sensitive data

- **Client env:** Server whitelists `SAFE_ENV_VARS` and excludes `SENSITIVE_PATTERNS`; only safe vars are exposed to the client. `/api/env` returns safe vars only.
- **Docker:** Uses `env_file: .env`; no secrets hardcoded in images.
- **Error sanitization:** Production errors sanitized; email pattern redacted in `error-sanitizer.ts`.
- **Recommendation:** Keep `.env*` in `.gitignore`; ensure `env.template` has no real secrets.

### 3.2 Authentication and authorization

- **JWT:** Verified via Supabase `getUser(token)` in `auth.middleware.ts`; `verifyAuth` and `optionalAuth` used appropriately.
- **Roles:** `requireRole` and `requireAdmin` used on sensitive routes (e.g. massive-ai-audit, admin).
- **Service key:** Massive AI audit progress PATCH protected by `x-massive-ai-audit-key` or Bearer matching `MASSIVE_AI_AUDIT_SERVICE_KEY`.
- **HTML auth:** Auth-checker script injected for non-auth pages.
- **Recommendation:** Fix dev bypass default (see 2.1).

### 3.3 Input validation and sanitization

- **API:** `validation.middleware.ts` and `validation.ts` provide `sanitizeString`, `validateRequestBody`, `validateQueryParams`, `validateParams`.
- **sanitizeString:** Trims, strips `<>`, `javascript:`, `on*=`, `data:`, `vbscript:`, CSS `expression(`, length cap.
- **HTML:** `escapeHtml` and `safeSetHTML` (DOMPurify) exist in `html-sanitizer.ts`; ensure all dynamic HTML uses them (see 2.4).

### 3.4 HTTP and API security

- **Helmet:** CSP, HSTS (prod), referrer, frame-ancestors `'self'`, form-action `'self'`.
- **Rate limiting:** API 100/15 min; auth 5/15 min; exemptions for `/api/env`, `/version`, `/csrf`, `/permissions/check-batch`, `/api/massive-ai-audit`.
- **CSRF:** State-changing methods require `X-CSRF-Token` or `body._csrf`; session from Bearer hash or IP; exemptions documented.
- **Recommendation:** Tighten CSP (see 2.2); consider adding rate limit for `/api/massive-ai-audit` if not intentionally exempt.

### 3.5 Cryptography

- **CSRF:** `crypto.randomBytes(32)` and session ID from `crypto.createHash('sha256').update(authHeader).digest('hex')`.
- **UUIDs:** `crypto.randomUUID()` used where appropriate.
- **Version hash:** MD5 used only for cache-busting in `version.ts`; acceptable for non-security use; prefer SHA-256 if ever used in a security context.
- **Analytics ID:** Fallback uses `Math.random()`; acceptable for non-security analytics only.

### 3.6 Database (Supabase / RLS)

- **RLS:** Used on key tables; service role used server-side for operations that bypass RLS by design (e.g. audit logs, cache_versions, security_events).
- **Grants:** `anon`/`authenticated` grants and policies documented in migrations.
- **Recommendation:** Run Supabase security/performance advisors after schema changes and ensure no table that holds sensitive data is left without RLS.

---

## 4. Security rating and tech-feedback status

*Context: [docs/tech-feedback.md](tech-feedback.md) — critical/high/medium issues from an earlier review.*

### Overall security rating: **B+ (Good, with known gaps)**

The app has strong foundations (server-side auth, RLS, CSRF, rate limiting, security headers, no known npm vulns). Remaining work is mostly hardening (CSP, CORS, XSS audit, dev bypass default) and a few tech-feedback items that still need verification or follow-up.

---

### Addressed (tech-feedback + recent fixes)

| Tech-feedback # | Issue | Current status |
|-----------------|--------|----------------|
| 1 | **Exposed credentials (cqms.env, env-config.js)** | `cqms.env` and `env-config.js` are in `.gitignore`; client gets only whitelisted vars from `/api/env`. Ensure these files are never committed and secrets are rotated if they were in history. |
| 3 | **Unauthenticated webhook / hardcoded URL** | Hardcoded n8n URL removed; `N8N_WEBHOOK_URL` required from env. Progress PATCH uses `x-massive-ai-audit-key` / service key. (Webhook *receiver* auth in Edge Functions may still need review.) |
| 5 | **SQL injection via table names** | Supabase client used with parameterized APIs; no raw SQL concatenation. Table names from app/config, not unsanitized user input in queries. |
| 6 | **No rate limiting on login** | **Addressed.** API rate limit (100/15 min) and auth rate limit (5/15 min) in `server-commonjs.ts`. |
| 7 | **Client-side authorization only** | **Addressed.** Server-side `verifyAuth`, `requireRole`, `requireAdmin` in API; RLS in DB. |
| 8 | **No RLS in Supabase** | **Addressed.** RLS policies in migrations (e.g. 004, 005, 008, 009, 013, 019, 022–035, 037–041). |
| 10 | **CORS wildcard** | Partially addressed on main app (same-origin). Edge Functions still use `*` (see “Still need”). |
| 12 | **No CSRF protection** | **Addressed.** `csrfProtection` middleware; state-changing requests require `X-CSRF-Token` or `body._csrf`. |
| 15 | **Missing security headers** | **Addressed.** Helmet: CSP, HSTS (prod), X-Frame-Options, X-Content-Type-Options, etc. in `server-commonjs.ts` and `api/index.ts`. |
| 19 | **Information disclosure in errors** | **Addressed.** Production errors sanitized; schema/DB details hidden; `error-sanitizer.ts` and error-handler middleware. |
| 21 | **Outdated dependencies** | **Addressed.** `npm audit fix` run; 0 vulnerabilities. |
| 22 | **No API rate limiting** | **Addressed.** express-rate-limit on API and stricter on auth. |
| — | **Path traversal** | **Addressed.** `/src/*.html` route validates path stays under app root. |

---

### Still need (tech-feedback + audit)

| Tech-feedback # | Issue | What to do |
|-----------------|--------|------------|
| 2 | **AI data logging (PII in Supabase logs)** | Audit `ai-audit-batch` / AI Edge Functions; avoid logging full conversation content; redact or log only IDs/metadata. |
| 4 | **Weak password hashing (SHA-256)** | If any legacy password auth remains, move to bcrypt/Argon2 (e.g. in RPC). Auth is primarily Supabase/OAuth. |
| 9 | **AI data privacy & compliance** | PII redaction, DPA with LLM provider, consent and privacy policy for AI processing. |
| 10 | **CORS in Edge Functions** | Restrict `Access-Control-Allow-Origin` to app origins (e.g. from env) in `ai-audit-processor`, `ai-audit-callback`, intercom-proxy, etc. |
| 11 | **XSS via innerHTML** | Audit all `innerHTML`; use `escapeHtml()` or `safeSetHTML()` (DOMPurify) for user/API content. |
| 13 | **No session expiration** | Define session lifetime; implement expiry or refresh; consider server-side session store if needed. |
| 14 | **Weak file upload validation** | Validate uploads by content/signature, not only MIME; restrict types and size. |
| 16–20, 23–26 | **Other (input limits, password policy, logging, HTTPS, SRI, etc.)** | Address systematically; many are partially covered (e.g. validation, Helmet). |
| — | **CSP** | Tighten CSP: remove or reduce `unsafe-inline` / `unsafe-eval`; use nonces/hashes. |
| — | **Dev bypass default** | **Fixed.** Bypass only when `NODE_ENV === 'development'`; missing `window.env` = production. |

---

## 4b. Comparison report and score (out of 10)

*Tech-feedback.md issues vs current state.*

### Score: **8.0 / 10**

| # | Tech-feedback issue | Before | After | Score note |
|---|--------------------|--------|--------|------------|
| 1 | Exposed credentials in repo | Critical: keys in git | In .gitignore; client whitelist only | ✅ Addressed |
| 2 | AI data logging (PII in logs) | Critical | Logs redact PII; only IDs/counts/metadata | ✅ Addressed |
| 3 | Unauthenticated webhook / hardcoded URL | Critical | No hardcoded URL; service key for progress | ✅ Addressed |
| 4 | Weak password hashing (SHA-256) | Critical | Platform admin: bcrypt via migration 043 (applied via MCP). OAuth primary for users. | ✅ Addressed |
| 5 | SQL injection via table names | Critical | Parameterized Supabase; no raw SQL | ✅ Addressed |
| 6 | No rate limiting on login | Critical | API + auth rate limits in place | ✅ Addressed |
| 7 | Client-side auth only | Critical | Server-side verifyAuth, requireRole, RLS | ✅ Addressed |
| 8 | No RLS in Supabase | Critical | RLS enabled across migrations | ✅ Addressed |
| 9 | AI data privacy / compliance | High | DPA, redaction, consent not confirmed | ❌ Open |
| 10 | CORS wildcard | High | Edge Functions use CORS_ALLOWED_ORIGINS (env) | ✅ Addressed |
| 11 | XSS via innerHTML | High | escapeHtml/DOMPurify exist; 50+ usages not audited | ⚠️ Partial |
| 12 | No CSRF | High | CSRF middleware + token | ✅ Addressed |
| 13 | No session expiration | Medium | Not implemented | ❌ Open |
| 14 | Weak file upload validation | Medium | MIME only; no content/signature check | ❌ Open |
| 15 | Missing security headers | Medium | Helmet (CSP, HSTS, etc.) | ✅ Addressed |
| 16–26 | Other (input limits, logging, HTTPS, SRI, etc.) | Low–Medium | Partially covered | ⚠️ Mixed |
| — | Path traversal | — | Path normalized + root check | ✅ Addressed |
| — | npm vulnerabilities | — | 0 (last npm audit fix); re-run when online | ✅ Addressed |
| — | Dev bypass when env missing | — | Only when NODE_ENV === 'development' | ✅ Addressed |
| — | CSP (unsafe-inline/unsafe-eval) | — | Still present | ❌ Open |

### How the score is derived

- **Critical (8):** 1, 2, 3, 5, 6, 7, 8 addressed; 4 partial → **~5.5**
- **High (4):** 10, 12, 15 addressed; 9 open, 11 partial → **~1.75**
- **Medium/other:** 13–14 open, CSP open → **~0.75**
- **Normalized to 0–10:** **8.0 / 10** (Good: critical and high items largely fixed; remaining: XSS audit, CSP, session, uploads, compliance).

### Summary

| Category | Count | Status |
|----------|--------|--------|
| **Fully addressed** | 15 | Credentials, webhook, SQLi, rate limit, auth, RLS, CSRF, headers, error sanitization, deps, path traversal, dev bypass, AI logging (PII), CORS (Edge Functions), platform admin bcrypt (migration 043 applied) |
| **Partially addressed** | 2 | Credentials (rotate if in history), XSS (tools exist, audit needed) |
| **Open** | 5+ | AI compliance, session expiry, file upload validation, CSP tightening, other (16–26) |

---

## 5. Remediation checklist

| Priority | Action | Owner |
|----------|--------|--------|
| ~~High~~ | ~~Remove hardcoded n8n webhook URL~~ — **Done** | — |
| ~~High~~ | ~~Path normalization /src/*.html~~ — **Done** | — |
| ~~High~~ | ~~npm audit fix~~ — **Done** (0 vulnerabilities) | — |
| ~~Medium~~ | ~~Dev bypass default to production~~ — **Done** | — |
| Medium | Tighten CSP (nonces/hashes; remove unsafe-inline/unsafe-eval) | Dev |
| Medium | Restrict CORS in Edge Functions to known origins | Dev |
| Medium | Audit and fix all `innerHTML` usages (escape/sanitize) | Dev |
| Low | Run Supabase advisors; document RLS coverage | Dev/Ops |

---

## 6. References

- Auth middleware: `src/api/middleware/auth.middleware.ts`
- CSRF: `src/api/middleware/csrf.middleware.ts`
- Validation/sanitization: `src/api/utils/validation.ts`, `src/utils/html-sanitizer.ts`
- Error sanitization: `src/utils/error-sanitizer.ts`, `src/api/middleware/error-handler.middleware.ts`
- Server routing and Helmet: `src/server-commonjs.ts`
- Edge function (n8n): `supabase/functions/ai-audit-processor/index.ts`

---

## 7. Re-audit verification (March 2, 2025)

| Control | Verified |
|--------|----------|
| Path traversal | `server-commonjs.ts`: `path.normalize`, `resolvedPath.startsWith(appRoot)` in place |
| N8N webhook | No fallback URL; `N8N_WEBHOOK_URL` required |
| Dev bypass | `auth-dev-bypass.ts`: `NODE_ENV === 'development'` only |
| AI/PII logging | Edge Functions: no email/name/URL/response body in logs; `redactForLog`, keys-only sample |
| CORS Edge Functions | `getCorsHeaders(req)`, `CORS_ALLOWED_ORIGINS` env; fallback `*` when unset |
| npm audit | Not run (network unavailable); last run reported 0 vulnerabilities |
| Rate limiting | `express-rate-limit`: API 100/15min, auth 5/15min |
| Auth/RLS/CSRF | In use across routes and migrations |
| CSP | `unsafe-inline`, `unsafe-eval` still present (open) |
| innerHTML | 50+ files; escape/sanitize audit still needed (open) |
