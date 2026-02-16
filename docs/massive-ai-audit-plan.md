# Massive AI Audit — Feature Plan & Documentation

This document describes the plan for the **Massive AI Audit** feature: running AI-powered audits for multiple agents over a date range, with progress tracking and results in the CQMS platform. Audits are executed via an n8n workflow; the platform triggers the workflow and stores results in the database.

---

## 1. Overview

### 1.1 Goal

- Allow users to **select multiple agents** (people with Intercom ID and name), a **date range**, and a **scorecard**, then **run an AI audit** for all selected agents in that range.
- Users see **progress** (percentage, agent/chat breakdown) while the audit runs, and **results** when complete.
- The platform sends the necessary data to an **n8n workflow**; n8n runs the AI audits and **writes results back** to the CQMS database.

### 1.2 Key Constraints

- **One webhook call per agent**: To avoid overwhelming n8n, the platform sends **one payload per selected person** with a **2-second interval** between requests.
- **Server-side triggering**: The “one-by-one with delay” loop runs on the **server** (API), not in the browser, so the process continues even if the user closes the tab.
- **Single job per run**: One user action (“Run AI Audit”) creates one **batch job**; all agents in that run are tied to the same `job_id` for progress and results.

### 1.3 Tech Stack

| Layer        | Technology / Approach                                      |
|-------------|-------------------------------------------------------------|
| Frontend    | Existing CQMS UI (Audit Distribution → AI view + new page) |
| Backend API | Express (existing `api/`, `src/api/`)                       |
| Database    | Supabase (Postgres)                                         |
| Automation  | n8n workflow (Intercom + AI + callback)                     |
| Callback    | Supabase Edge Function `ai-audit-callback`                  |

---

## 2. User Flow

1. User goes to **Audit Distribution → AI** (or a dedicated “Massive AI Audit” entry point).
2. User **selects multiple agents** (only those with Intercom ID are valid).
3. User selects **date range** (start date, end date).
4. User selects **scorecard** (defines prompts/criteria for the audit).
5. User optionally sets **notify me when done** and **notify results to audited people**.
6. User clicks **Run AI Audit**.
7. Platform creates a **job**, starts sending payloads to n8n (one per agent, 2s apart), and **redirects** (or opens) the **progress/results page** for that job.
8. On the progress page, user sees:
   - **Status**: Queued | Running | Completed | Failed
   - **Progress**: Percentage (e.g. 45%)
   - **Breakdown**: e.g. “3 of 10 agents completed”, “150 of 2000 chats completed”
9. When status is **Completed**, user sees the **results**: list/table of audits for that job (with links to individual audit view if applicable).

---

## 3. Data Model

### 3.1 New Table: `massive_ai_audit_jobs`

Tracks each “run” (one batch of agents + date range + scorecard).

| Column                  | Type         | Description |
|-------------------------|--------------|-------------|
| `id`                    | UUID (PK)    | Job identifier. |
| `created_at`            | timestamptz  | When the job was created. |
| `created_by`            | text         | Email (or user id) of the user who started the job. |
| `scorecard_id`          | UUID         | FK to scorecards. |
| `start_date`            | date         | Start of audit date range. |
| `end_date`              | date         | End of audit date range. |
| `status`                | text         | `queued` \| `running` \| `completed` \| `failed` \| `cancelled`. |
| `total_agents`          | int          | Number of selected agents. |
| `total_conversations`   | int (nullable) | Total conversations to audit (set when n8n/callback reports it). |
| `completed_agents`     | int (default 0) | Number of agents fully processed. |
| `completed_conversations` | int (default 0) | Number of conversations audited. |
| `payload_snapshot`      | jsonb        | Snapshot of input (e.g. intercom_admin_ids, agent emails) for display. |
| `error_message`        | text (nullable) | Set when status = `failed`. |
| `completed_at`         | timestamptz (nullable) | When the job reached completed/failed. |

**Derived progress**

- **Percentage (conversations):** If `total_conversations > 0`: `(completed_conversations / total_conversations) * 100`.
- **Percentage (agents):** Fallback: `(completed_agents / total_agents) * 100`.
- **Breakdown:** e.g. “3 of 10 agents”, “150 of 2000 chats”, “7.5% (running)”.

### 3.2 Linking Results to the Job

- Add column to **`audit_assignments`**: `massive_audit_job_id` (UUID, nullable). When n8n/callback creates an assignment for a massive-audit run, set this to the job’s `id`.
- Optionally add the same to the **scorecard audit table** row (if you store job reference there) for easier querying.

### 3.3 Optional: Progress / Error Detail

- **`massive_ai_audit_progress`** (optional): `job_id`, `intercom_admin_id` (or agent email), `conversation_id`, `status` (pending \| processing \| completed \| failed), `completed_at`. Use if you need per-agent or per-conversation breakdown in the UI.
- **`massive_ai_audit_errors`** (optional): Store per-conversation or per-agent errors for “X succeeded, Y failed” and debugging.

---

## 4. API Design

### 4.1 Start Batch (Platform → Create Job + Trigger n8n)

- **Endpoint:** `POST /api/massive-ai-audit/start`
- **Auth:** Required (e.g. existing `verifyAuth`).
- **Body:**
  - `scorecard_id` (required)
  - `start_date`, `end_date` (required, YYYY-MM-DD)
  - `intercom_admin_ids` (required, array of strings, non-empty)
  - `notify_me_when_done` (boolean)
  - `notify_results_to_audited_people` (boolean)
  - Optional: `agents` — `[{ intercom_admin_id, email, name }]` for display and callback.
- **Behavior:**
  1. Create row in `massive_ai_audit_jobs` (status `queued`, `total_agents` = length of `intercom_admin_ids`).
  2. Return response immediately with `job_id` (and optionally `status`).
  3. **Asynchronously** (non-blocking): loop over `intercom_admin_ids`; for each id, POST to n8n webhook with payload `{ job_id, scorecard_id, start_date, end_date, intercom_admin_ids: [this_id], notify_* }`, then wait 2 seconds before the next request.
- **Response:** `{ success: true, job_id: "<uuid>", status: "queued" }`.

### 4.2 Get Job (Progress + Details)

- **Endpoint:** `GET /api/massive-ai-audit/jobs/:id`
- **Auth:** Required; optionally restrict to `created_by` or by role.
- **Response:** Job row (or 404). Frontend uses this for progress bar, breakdown, status.

### 4.3 Progress Update (n8n / Edge Function → Backend)

- **Endpoint:** `PATCH /api/massive-ai-audit/jobs/:id/progress`
- **Auth:** Service/auth that n8n or the edge function can use (e.g. API key, service role). Must not be end-user auth only.
- **Body:** `total_conversations?`, `completed_agents?`, `completed_conversations?`, `status?`
- **Behavior:** Update the job row; if `status` is `completed` or `failed`, set `completed_at`.

### 4.5 List Jobs (Optional)

- **Endpoint:** `GET /api/massive-ai-audit/jobs` (optional)
- **Query:** e.g. `created_by`, `status`, pagination.
- **Use:** “My recent massive audits” or admin list.

---

## 5. n8n Workflow Contract

### 5.1 Trigger (Platform → n8n)

- **Method:** POST.
- **URL:** The platform does **not** call n8n directly. It calls the Supabase Edge Function **`massive-ai-audit-trigger`**, which forwards the payload to the n8n webhook. The n8n webhook URL is configured inside the edge function (e.g. `https://n8nnextventures.xyz/webhook-test/massive-ai-audit`), not in app env.
- **Payload per request (one agent per call):**

```json
{
  "job_id": "<uuid>",
  "scorecard_id": "<uuid>",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "intercom_admin_ids": ["<single_admin_id>"],
  "notify_me_when_done": true,
  "notify_results_to_audited_people": false
}
```

- **Interval:** Platform sends one request per agent with a **2-second delay** between requests.

- **Full payload spec + n8n instructions:** See **[n8n-massive-ai-audit.md](n8n-massive-ai-audit.md)** for the exact JSON, field types, and step-by-step instructions. Importable workflow: **[n8n-massive-ai-audit-workflow.json](n8n-massive-ai-audit-workflow.json)**.

### 5.2 Workflow Responsibilities

- Receive webhook → normalize payload (dates, single admin).
- Call Intercom API: search conversations by `admin_assignee_id` and date range; paginate as needed.
- For each conversation: fetch full conversation, build transcript (Agent/Client/Note).
- Run AI audit using scorecard prompts (from API or passed in).
- For each completed audit: call **Supabase Edge Function** `ai-audit-callback` with result payload.
- Optionally: call platform **progress API** (`PATCH .../jobs/:id/progress`) to update `completed_conversations` / `completed_agents` / `status`.

### 5.3 Callback Payload (n8n → Edge Function)

Each audit result should include at least:

- `conversation_id`, `scorecard_id`, `audit_date`, `employee_email`, `employee_name`, `batch_id` (e.g. = `job_id`), `created_by`
- `ai_scorecard_data` (field_id → value), `ai_confidence_score`, `ai_notes`
- Optionally `table_id` or scorecard table name for the audit row.

The edge function should:

- Insert/update `audit_assignments` (with `massive_audit_job_id` = `job_id`).
- Insert row into the scorecard’s audit table (same shape as manual audits).
- Optionally update job progress (e.g. increment `completed_conversations`, set `completed_at` when job is done).

### 5.4 Meta on Every Item

- Ensure `job_id`, `scorecard_id`, `employee_email`, `employee_name`, `batch_id`, `audit_date` are carried through the workflow so the callback and progress API receive correct data (e.g. from webhook + sheet or in-memory flow).

---

## 6. Frontend (UI) Plan

### 6.1 Run AI Audit (Existing Flow, Wired Up)

- **Location:** Audit Distribution → AI view (or dedicated Massive AI Audit page).
- **Reuse:** Agent list (with Intercom ID filter), date range, scorecard dropdown, notify options from current AI audit modal.
- **On Submit:**
  1. Call `POST /api/massive-ai-audit/start` with all selected agents and options.
  2. Receive `job_id`.
  3. Redirect (or open in new tab) to **progress/results page** with `?id=<job_id>` (e.g. `/massive-ai-audit/result` or similar route).

### 6.2 Progress & Results Page (New)

- **Route:** e.g. `/massive-ai-audit/result?id=<job_id>` or equivalent.
- **Data:** Poll `GET /api/massive-ai-audit/jobs/:id` every 5–10 seconds (or use Supabase realtime on `massive_ai_audit_jobs`).
- **Display:**
  - **Status badge:** Queued | Running | Completed | Failed.
  - **Progress bar:** Percentage from job row.
  - **Breakdown:** “X of Y agents completed”, “X of N chats completed”, “Z% (running)”.
  - If **Failed:** show `error_message`.
  - When **Completed:** show results section (table/list of audits for this job).
- **Results section:** Query audits where `massive_audit_job_id` = `job_id` (e.g. via `audit_assignments` join with scorecard table or existing audit list API); show agent, conversation, score, link to audit view if applicable.

---

## 7. Callback & Scorecard Integration

- **Edge function** `ai-audit-callback`: Receives one audit per conversation; writes to `audit_assignments` and scorecard table; sets `massive_audit_job_id` on assignment.
- **Scorecard prompts:** Either (a) n8n fetches scorecard + parameters from CQMS API by `scorecard_id`, or (b) callback performs mapping server-side; ensure `scorecard_id` (and table name if needed) is in every callback payload.
- **Progress:** Callback or n8n can call `PATCH /api/massive-ai-audit/jobs/:id/progress` to keep the job row updated.

---

## 8. Safety, Limits & Notifications

### 8.1 Idempotency & UX

- One job per “Run”; disable “Run AI Audit” after click and show “Job started” with link to progress page.
- Avoid double-submit (e.g. disable button, or guard in API by checking for duplicate job within a short window).

### 8.2 Rate Limits

- 2-second interval between n8n webhook calls from the platform.
- Inside n8n: throttle Intercom/API calls if needed to respect provider limits.

### 8.3 Errors

- Per-conversation or per-agent failures should not fail the entire job; track completed vs failed counts if needed (e.g. optional `massive_ai_audit_errors` table).
- Set job `status = 'failed'` and `error_message` only when the whole run is aborted (e.g. workflow crash, config error).

### 8.4 Credentials

- Store Intercom token and Supabase keys in n8n credentials / env; do not hardcode in workflow JSON.

### 8.5 Notifications

- When job reaches **completed** (or **failed**): if `notify_me_when_done` is true, notify `created_by` (e.g. in-app or email using existing notification path).
- If `notify_results_to_audited_people` is true: notify audited agents (e.g. by email/list from job payload or from `audit_assignments` for that job).

---

## 9. Implementation Checklist

Use this as a phased checklist; order can be adjusted based on dependencies.

### Phase 1: Data & API

- [x] Create migration for `massive_ai_audit_jobs` table (`038_create_massive_ai_audit_jobs_table.sql`).
- [x] Add `massive_audit_job_id` to `audit_assignments` (migration `039_add_massive_audit_job_id_to_audit_assignments.sql`).
- [x] Implement `POST /api/massive-ai-audit/start` (create job + async loop with 2s delay, call n8n).
- [x] Implement `GET /api/massive-ai-audit/jobs/:id`.
- [x] Implement `GET /api/massive-ai-audit/jobs/:id/assignments` (results for completed job).
- [x] Implement `PATCH /api/massive-ai-audit/jobs/:id/progress` (auth via `MASSIVE_AI_AUDIT_SERVICE_KEY`).
- [x] Trigger flow: API calls Edge Function `massive-ai-audit-trigger` (using `SUPABASE_URL` + Supabase key); edge function holds n8n URL and forwards. No n8n URL in app env. `MASSIVE_AI_AUDIT_SERVICE_KEY` remains for progress updates (see `env.template`).

### Phase 2: n8n & Callback

- [ ] Ensure n8n workflow accepts **one agent per webhook** (single `intercom_admin_id` per run).
- [ ] Ensure meta (`job_id`, `scorecard_id`, `employee_email`, `employee_name`, `batch_id`, `audit_date`) is passed through and sent to callback.
- [ ] Update edge function `ai-audit-callback` to write `massive_audit_job_id` and optionally call progress API.
- [ ] (Optional) Add progress API calls from n8n or edge function.

### Phase 3: Frontend

- [x] Wire “Run AI Audit” submit to `POST /api/massive-ai-audit/start` and redirect to progress page with `job_id` (`ai-audit-view.ts`).
- [x] Add route/page for progress & results: `/src/features/massive-ai-audit/presentation/massive-ai-audit-result.html?id=<job_id>`.
- [x] Implement progress view (poll every 6s), progress bar, breakdown (agents, chats, %).
- [x] Implement results section when status = completed (table of assignments with links to audit view).

### Phase 4: Polish

- [ ] Notifications (notify_me_when_done, notify_results_to_audited_people).
- [ ] Optional: list jobs (`GET /api/massive-ai-audit/jobs`), link from Audit Distribution or sidebar.
- [ ] Optional: per-agent or per-conversation progress table and UI breakdown.
- [ ] Limits: max agents per run, max date range (e.g. 90 days) if required.

---

## 10. Verification (MCP)

Verified on **cqms-staging** (project `mdaffwklbdfthqcjbuyw`):

- **Table** `massive_ai_audit_jobs` exists; migrations 038 and 039 applied.
- **Edge function** `massive-ai-audit-trigger` is deployed and **ACTIVE**; `verify_jwt: true`; forwards to `https://n8nnextventures.xyz/webhook-test/massive-ai-audit`.
- **App `.env`** uses the same project (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), so the API will call the edge function without extra env. No need to set `MASSIVE_AI_AUDIT_EDGE_FUNCTION_URL` unless you point `SUPABASE_URL` at a different project.

To run an audit: use Audit Distribution → AI Audit, pick scorecard/date range/agents, Run → you are redirected to the result page; the API creates the job and triggers the edge function once per agent (2s apart). Progress updates when n8n calls `PATCH /api/massive-ai-audit/jobs/:id/progress` (set `MASSIVE_AI_AUDIT_SERVICE_KEY` and use it in the callback).

---

## 11. Document History

| Date       | Change |
|------------|--------|
| 2026-02-10 | Initial plan created from feature discussion. |
| 2026-02-10 | Phase 1–3 implemented: migrations, API routes, frontend wiring, result page. |

---

*This plan is the single source of truth for the Massive AI Audit feature. Update this document when the design or implementation details change.*
