# Massive AI Audit — Task List

Each task has a **title** (in the context of Massive AI) and a **description** of what was done.

---

## Database & data model

### 1. Massive AI: Create batch jobs table
**Description:** Added a new table `massive_ai_audit_jobs` to store each batch run. The table holds job id, creator, scorecard, date range, status (queued, running, completed, failed, cancelled, scheduled), total and completed counts for agents and conversations, a payload snapshot, error message, and completed_at. Indexes and RLS were added so users can only read and insert their own jobs.

### 2. Massive AI: Link audit results to batch job
**Description:** Extended `audit_assignments` with a nullable `massive_audit_job_id` column (FK to `massive_ai_audit_jobs`) so every result produced by a Massive AI run can be tied to the correct batch job for filtering and reporting.

### 3. Massive AI: Restrict scorecards used in batch runs
**Description:** Added a `use_for_massive_ai_audit` boolean (default false) on the scorecards table. Only scorecards with this flag set to true are shown in the Massive AI Audit scorecard picker when starting a batch.

### 4. Massive AI: Let elevated roles see all batch jobs
**Description:** Implemented an RLS policy so Quality Analysts, Admins, and Super Admins can see all Massive AI audit jobs (not only their own). Other users continue to see only jobs they created.

### 5. Massive AI: Support scheduled jobs and concurrency limit
**Description:** Introduced a `scheduled` status and `scheduled_at` column on `massive_ai_audit_jobs`. When the platform already has two audits running (queued + running), new start requests can create a job as scheduled instead of failing; scheduled jobs are started automatically in FIFO order when a slot frees up.

---

## Backend API

### 6. Massive AI: Start a batch audit
**Description:** Implemented `POST /api/massive-ai-audit/start` to create a job from scorecard, date range, and selected agents (Intercom admin IDs). The API enforces a maximum of two concurrent runs; if the limit is reached, it either returns 429 or creates a scheduled job when the user opts for “schedule for later.” After responding with `job_id`, it triggers the audit by calling the edge function once per agent with a 2-second delay between calls.

### 7. Massive AI: Get a single batch job (progress and details)
**Description:** Implemented `GET /api/massive-ai-audit/jobs/:id` so the progress page can load one job’s current status, progress counts, and metadata. Access is subject to RLS (owner or elevated role).

### 8. Massive AI: List batch jobs with filters
**Description:** Implemented `GET /api/massive-ai-audit/jobs` with optional query params: created_by, status, scorecard_id, from_date, to_date. Returns up to 100 jobs for the Batches view and filters; RLS applies so users only see jobs they are allowed to see.

### 9. Massive AI: Get results for one batch job
**Description:** Implemented `GET /api/massive-ai-audit/jobs/:id/assignments` to return all Massive AI audit results (from `massive_ai_audit_results`) for a given job id. The user must have access to the job (RLS). Results are paginated in chunks of 1000.

### 10. Massive AI: Update job progress (for n8n/callback)
**Description:** Implemented `PATCH /api/massive-ai-audit/jobs/:id/progress` so n8n or the edge function can update a job’s total_conversations, completed_agents, completed_conversations, and status. Auth is via `x-massive-ai-audit-key` or Bearer using `MASSIVE_AI_AUDIT_SERVICE_KEY`. Supports atomic increment of completed_agents and optional auto-complete when all agents are done; when a job reaches a terminal state, the next scheduled job is started if a slot is free.

### 11. Massive AI: Cancel a batch job
**Description:** Implemented `POST /api/massive-ai-audit/jobs/:id/cancel` so a user can cancel a queued, running, or scheduled job. The job id is added to an in-memory set and the DB status is set to cancelled so the server-side trigger loop stops sending further payloads to n8n; already-dispatched workflows may still finish.

### 12. Massive AI: Mark a batch job as completed (user action)
**Description:** Implemented `POST /api/massive-ai-audit/jobs/:id/complete` so a user can manually mark a running or queued job as completed. After updating status and completed_at, the platform attempts to start the next scheduled job if applicable.

### 13. Massive AI: List creators for filter dropdown
**Description:** Implemented `GET /api/massive-ai-audit/creators` to return distinct `created_by` values from jobs visible to the current user. Used to populate the “Creator” filter on the Batches and Overview views.

### 14. Massive AI: List scorecards for filter dropdown
**Description:** Implemented `GET /api/massive-ai-audit/scorecards` to return scorecards that appear in visible Massive AI jobs (by collecting scorecard_id from jobs, then fetching id and name). Used for the “Scorecard” filter.

### 15. Massive AI: Aggregated analytics for Overview
**Description:** Implemented `GET /api/massive-ai-audit/analytics` with the same filter params as the jobs list. It loads all matching jobs and their results from `massive_ai_audit_results`, then returns summary stats (totals, pass/fail, pass rate, avg score, error counts by severity), trend by day, top failing parameters, by-employee and by-scorecard breakdowns, score distribution, error count distribution, fail-all stats, criteria details, and a risk matrix for the Overview & trends tab.

### 16. Massive AI: List all results with filters
**Description:** Implemented `GET /api/massive-ai-audit/results` with created_by, status, scorecard_id, from_date, to_date. It resolves visible job ids from the jobs table, then paginates through `massive_ai_audit_results`. Results are enriched with employee name/email from the job’s payload_snapshot when missing.

### 17. Massive AI: Employee “My AI Audits” results
**Description:** Implemented `GET /api/massive-ai-audit/my-results` to return all Massive AI audit results where the logged-in user’s email matches `employee_email`. Results are paginated; a map of job metadata (date range, status, etc.) is included so the “My AI Audits” page can show context.

---

## Trigger & automation

### 18. Massive AI: Server-side trigger loop (one payload per agent)
**Description:** Implemented the server-side loop that, after a job is created, calls the Massive AI Audit edge function once per selected agent with a 2-second delay between calls. The loop runs in the background (e.g. via setImmediate) so the user can close the tab and the batch still runs. Before each call it checks whether the job was cancelled and stops if so.

### 19. Massive AI: Edge function to forward payloads to n8n
**Description:** Implemented the Supabase Edge Function `massive-ai-audit-trigger`, which receives the single-agent payload from the CQMS API, validates job_id and intercom_admin_ids, and forwards the same JSON body to the configured n8n webhook. The n8n URL is kept in the edge function, not in the app environment.

### 20. Massive AI: Auto-start next scheduled job when a slot frees up
**Description:** When a job reaches a terminal state (completed, failed, or cancelled), the API runs logic to see if fewer than two audits are now active. If so, it selects the oldest job with status `scheduled` (by scheduled_at), updates it to `queued`, and kicks off the same trigger loop for that job so scheduled batches run in order without manual action.

---

## Callback & results storage

### 21. Massive AI: Callback to store one audit result
**Description:** Implemented the Supabase Edge Function `ai-audit-callback`, which receives one audit result per conversation from n8n (conversation_id, scorecard_id, massive_audit_job_id, employee info, AI scores and notes, parameters_result). It derives pass/fail from the score and writes a single row into `massive_ai_audit_results` only; it does not write to manual audit tables or scorecard-specific audit tables.

---

## Frontend — starting a batch

### 22. Massive AI: Wire “Run AI Audit” to start API and redirect
**Description:** In the Audit Distribution AI view, the “Run AI Audit” button was wired to call `POST /api/massive-ai-audit/start` with the selected agents, date range, scorecard, and notify options. On success, the user is redirected to the Massive AI Audit result page with the returned job_id. If the API returns 429 (max concurrent audits), the UI offers “Schedule for later” and resubmits with schedule_for_later; the user is still redirected to the result page for the scheduled job.

---

## Frontend — progress & results page

### 23.  Massive AI: Wire “Run AI Audit” to start API and redirect
**Description:** Built the Massive AI Audit result page so that when opened with a job id (?id=), it polls `GET /api/massive-ai-audit/jobs/:id` (e.g. every 6 seconds) and shows status (Queued, Running, Scheduled, Completed, Failed, Cancelled), a progress bar, and a breakdown (e.g. “X of Y agents”, “X of N chats”). When the job is completed, it loads and displays the list of results (assignments) with links to the audit view. The page includes a cancel button for queued, running, or scheduled jobs and supports dark theme and responsive layout.

### 24. Massive AI: Batches list and filters
**Description:** On the same result page, added a “Batches” view that lists all visible jobs as cards (status, progress, date range, scorecard, creator). Implemented filters for creator, status, scorecard, and date range (from_date, to_date) that apply to both the Batches list and the Overview analytics, using the existing jobs and analytics APIs.

### 25. Massive AI: Overview & trends analytics UI
**Description:** Added an “Overview & trends” tab that calls `GET /api/massive-ai-audit/analytics` (with the same filters as Batches) and renders summary KPIs, trend chart by day, severity donut, error count distribution, risk matrix, sortable employee performance table, scorecard comparison chart, criteria details table, focus areas, compliance list, smart insights, and team health bar so managers can analyze Massive AI audit outcomes at a glance.

### 26. Massive AI: Navigation and routing for result and “My Audits” pages
**Description:** Registered the Massive AI Audit result page and the “My AI Audits” page in the app’s route config with appropriate labels, roles (Quality Analyst, Admin, Super Admin), and “Beta” badge. Added sidebar entries so users can open “Massive AI Audit” and “My AI Audits” directly.

---

## Frontend — employee view

### 27. Massive AI: “My AI Audits” employee page
**Description:** Built the “My AI Audits” page where the logged-in user sees only the Massive AI audit results where they are the audited employee (matched by email). The page uses `GET /api/massive-ai-audit/my-results` to show KPIs and a list of their audits, with job metadata for context (e.g. date range, status).

---

## Safety, limits & configuration

### 28. Massive AI: Enforce max two concurrent batch runs
**Description:** Enforced a limit of two Massive AI audits in “active” state (queued or running) at once. When a third start request arrives and the user does not choose “schedule for later,” the API returns 429 with code MAX_CONCURRENT_AUDITS and a clear message so the user can cancel a running audit or schedule the new one.

### 29. Massive AI: Restrict progress updates to service key
**Description:** Secured the progress endpoint so only callers that send the correct `MASSIVE_AI_AUDIT_SERVICE_KEY` (via header or Bearer) can update job progress. This prevents end users from tampering with progress; only n8n or the edge function should call it.

### 30. Massive AI: Role-based access to Massive AI APIs and pages
**Description:** Applied role checks so only Quality Analyst, Admin, and Super Admin can access Massive AI start, jobs, results, analytics, and related pages. Progress PATCH uses a separate service-key auth and is not tied to user roles.

---

## Documentation & n8n

### 31. Massive AI: Feature plan and implementation checklist
**Description:** Wrote and maintained `docs/massive-ai-audit-plan.md` as the single source of truth for the feature: goal, constraints, data model, API design, n8n contract, callback behavior, frontend plan, safety and limits, and a phased implementation checklist with verification notes (e.g. staging DB and edge function checks).

### 32. Massive AI: n8n payload and workflow documentation
**Description:** Documented in `docs/n8n-massive-ai-audit.md` the exact JSON payload the platform sends per agent (via the edge function), the webhook URL setup, and step-by-step workflow instructions (Intercom fetch, AI audit, callback to edge function, optional progress PATCH). Clarified that results are stored only in Massive AI (e.g. `massive_ai_audit_results`) and do not appear in manual audit flows.

### 33. Massive AI: n8n workflow adjustments for job_id and progress
**Description:** Wrote `docs/n8n-massive-ai-audit-adjustments.md` with concrete steps: normalize payload to include job_id, add an “Inject job context” node so each item has job_id and massive_audit_job_id, ensure the callback body sends massive_audit_job_id, and add a “Progress PATCH” node when the agent loop is done, including connection changes in the n8n UI.

---

*Use this list for standups, handoffs, or release notes. Update titles and descriptions when the feature changes.*
