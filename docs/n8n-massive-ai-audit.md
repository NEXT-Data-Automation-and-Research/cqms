# n8n Workflow: Massive AI Audit

This document describes the **exact JSON payload** the CQMS platform sends to your n8n webhook and gives **step-by-step instructions** to implement the workflow. A **full importable n8n workflow** (webhook → Intercom → loop → AI → callback → progress) is in **`n8n-massive-ai-audit-workflow.json`**.

**Important:** Massive AI audits are **separate from the regular audit system**. Users can select **any scorecard** to run an AI audit; results are stored only in **Massive AI** (table `massive_ai_audit_results`) and do **not** appear in Audit Reports or other manual-audit flows.

---

## 1. Payload we send (per request)

The platform sends **one HTTP POST per agent** to your n8n webhook (via the Supabase Edge Function). Each request body is a **single JSON object** with these fields:

| Field | Type | Description |
|-------|------|--------------|
| `job_id` | string (UUID) | Massive-audit job id. Use it in progress callbacks and when writing results to **Massive AI** (see below). |
| `scorecard_id` | string | Scorecard id. User can select **any** scorecard; use it to load scorecard prompts/criteria for the AI audit. |
| `start_date` | string | Start of date range, `YYYY-MM-DD`. |
| `end_date` | string | End of date range, `YYYY-MM-DD`. |
| `intercom_admin_ids` | string[] | **Always an array with exactly one element**: the Intercom admin/agent id for this request. |
| `notify_me_when_done` | boolean | If the user asked to be notified when the job completes. |
| `notify_results_to_audited_people` | boolean | If the user asked to notify audited people of results. |
| `agent_email` | string | Agent's email resolved from the `people` table. Used for `employee_email` in results. |
| `agent_name` | string | Agent's display name resolved from the `people` table. Used for `employee_name` in results. |

### Example payload (one request = one agent)

```json
{
  "job_id": "ea0569ec-03f7-479d-a3a3-89a5e5c4402c",
  "scorecard_id": "342e64f1-241f-4433-8074-2b990974d29b",
  "start_date": "2026-02-01",
  "end_date": "2026-02-10",
  "intercom_admin_ids": ["12345678"],
  "agent_email": "john.doe@company.com",
  "agent_name": "John Doe",
  "notify_me_when_done": true,
  "notify_results_to_audited_people": false
}
```

### Are we sending all the JSON properly?

**Yes.** The API builds this object for each agent and sends it as the request body (Content-Type: application/json). The edge function forwards the **same body** to your n8n URL with no extra wrapping. So in n8n, the Webhook node’s **Body** (or first input item) will have exactly these keys. We do **not** send agent name/email in this payload; you can resolve them from Intercom using `intercom_admin_ids[0]` if needed.

---

## 2. n8n webhook URL

- The CQMS API calls the **Supabase Edge Function** `massive-ai-audit-trigger`, which then POSTs to your n8n URL.
- Configured URL in the edge function: `https://n8nnextventures.xyz/webhook-test/massive-ai-audit`
- In n8n, your workflow’s **Webhook** node must listen on a path that matches this (e.g. path `massive-ai-audit` if your base is `https://n8nnextventures.xyz/webhook-test/`).

---

## 3. What the n8n workflow should do

1. **Trigger:** Webhook node, POST, path matching the URL above. Request body = payload above.
2. **Normalize:** Read `job_id`, `scorecard_id`, `start_date`, `end_date`, `intercom_admin_ids[0]`, and the two notify flags from the webhook body.
3. **Fetch Scorecard & Params:** Using the `scorecard_id`, call the Supabase REST API to fetch the scorecard metadata from `scorecards` and all active parameters from `scorecard_perameters` (ordered by `display_order`). Build a dynamic AI prompt from each parameter's `error_name`, `penalty_points`, `error_category`, `is_fail_all`, and `prompt` fields. This prompt is passed through the entire flow so the AI agent knows exactly what to audit against.
4. **Intercom:** For the single admin id, fetch conversations in the date range (e.g. by `admin_assignee_id` + `created_at` / `updated_at`). Paginate as needed.
5. **Per conversation:** Build a transcript (agent/client/notes), run your AI audit using the **dynamically fetched scorecard prompt** (not hardcoded), and produce an audit result.
6. **Write back to CQMS (Massive AI only):**
   - Call the **Supabase Edge Function** `ai-audit-callback` with each audit result. The callback **only** writes to **`massive_ai_audit_results`**—these audits are **not** part of the regular audit system (no `audit_assignments`, no scorecard-specific tables). Results are visible only under **Massive AI Audit** in the app.
   - Optionally call the **progress API** so the Jobs & History page updates (see below).

---

## 4. Progress API (optional)

To update the CQMS progress page (e.g. “3 of 10 agents”, “150 of 2000 chats”):

- **Endpoint:** `PATCH https://<your-cqms-api>/api/massive-ai-audit/jobs/:id/progress`
- **Auth:** Header `x-massive-ai-audit-key: <MASSIVE_AI_AUDIT_SERVICE_KEY>` or `Authorization: Bearer <MASSIVE_AI_AUDIT_SERVICE_KEY>`
- **Preferred body (atomic increment):**
  ```json
  { "increment_completed_agents": 1, "auto_complete": true }
  ```
  - `increment_completed_agents` (number) — atomically adds N to `completed_agents`. When `completed_agents >= total_agents` and `auto_complete` is true (default), the backend auto-sets `status: "completed"` and `completed_at`.
- **Legacy body (absolute values):**
  - `total_conversations` (number, optional)
  - `completed_agents` (number, optional) — sets absolute value (not safe for concurrent updates)
  - `completed_conversations` (number, optional)
  - `status` (optional): `queued` | `running` | `completed` | `failed` | `cancelled`
- When `status` is set to `completed` or `failed`, the backend sets `completed_at`.

---

## 5. Full workflow (import and configure)

The file **`n8n-massive-ai-audit-workflow.json`** contains the **whole workflow**:

| # | Node | Role |
|---|------|------|
| 1 | **Webhook - CQMS payload** | Receives POST with the JSON payload; responds 200 immediately. |
| 2 | **Extract payload** | Code node: reads `body` or root, outputs `job_id`, `scorecard_id`, `start_date`, `end_date`, `admin_id` (from `intercom_admin_ids[0]`), notify flags. |
| 2b | **Fetch Scorecard & Params** | Code node: uses `scorecard_id` to call Supabase REST API, fetches scorecard + all active `scorecard_perameters` (with `prompt`, `penalty_points`, `is_fail_all`, etc.), builds `scorecard_prompt` text for the AI. Passes all data downstream. |
| 3 | **Intercom - Search conversations** | HTTP POST to Intercom search API; filter by assignee + date range. **Set credentials:** Header Auth with Intercom API token. |
| 4 | **Conversations to items** | Code: normalizes search response to one item per conversation; passes through job/scorecard/admin. |
| 5 | **Loop conversations** | Split In Batches (size 1). Output 0 = next conversation; Output 1 = done → **Progress PATCH**. |
| 6 | **Has conversations?** | IF: when `_no_conversations` is true → go to Progress (skip); else → get conversation. |
| 7 | **Intercom - Get conversation** | HTTP GET single conversation by id. **Set credentials.** |
| 8 | **Build transcript** | Code: builds transcript from conversation parts; passes job_id, scorecard_id, conversation_id, audit_date. |
| 9 | **AI Audit (placeholder)** | HTTP POST to your AI/audit endpoint. **Replace URL and body** with your real AI or use an OpenAI/LLM node; output must include `ai_scorecard_data`, `ai_confidence_score`, `ai_notes`, `employee_email`, `employee_name` for the callback. |
| 10 | **CQMS callback** | HTTP POST to your Supabase Edge Function `ai-audit-callback`. **Set URL** (e.g. `https://YOUR_PROJECT.supabase.co/functions/v1/ai-audit-callback`) and **Header Auth** (Bearer with service/anon key). Body must include `massive_audit_job_id` = `job_id` so the result page lists the assignment. |
| 11 | **Progress PATCH** | HTTP PATCH to `https://YOUR_CQMS_API/api/massive-ai-audit/jobs/{{ job_id }}/progress`. **Set URL and Header** `x-massive-ai-audit-key: MASSIVE_AI_AUDIT_SERVICE_KEY`. Body: `status`, `completed_agents`, `completed_conversations`. Called when loop is done (and when there are no conversations). |

**Loop:** After **CQMS callback**, the flow connects back to **Loop conversations** for the next conversation; when the loop finishes, **Progress PATCH** runs.

### What you must set after import

1. **Webhook path** – Ensure path is `massive-ai-audit` (or match your full webhook URL).
2. **Intercom** – Create **Header Auth** credential (e.g. `Authorization: Bearer <intercom_token>`, `Accept: application/json`) and assign it to **Intercom - Search conversations** and **Intercom - Get conversation**. Adjust the search request body if your Intercom API version uses a different query format.
3. **AI Audit** – Replace the placeholder URL and body with your real AI audit service or add an OpenAI/LLM node and map its output to the shape the callback expects.
4. **CQMS callback** – Set URL to your `ai-audit-callback` Edge Function and add Header Auth (Supabase anon or service key).
5. **Progress PATCH** – Set base URL to your CQMS API and add header `x-massive-ai-audit-key` with value `MASSIVE_AI_AUDIT_SERVICE_KEY` (same as in your CQMS `.env`). Update the JSON body to send correct `completed_conversations` if you track them (e.g. from a counter in the loop).

### Optional

- **Per-conversation progress:** From **CQMS callback**, you can call the progress API with incremented `completed_conversations` (e.g. via a small subflow or expression), or call it once at the end with final counts.
- **Error handling:** Add Error Trigger or “Continue On Fail” on Intercom/AI/callback nodes and optionally PATCH progress with `status: "failed"` and `error_message`.

---

## 6. Quick reference: payload shape

```json
{
  "job_id": "<uuid>",
  "scorecard_id": "<string>",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "intercom_admin_ids": ["<single_admin_id>"],
  "agent_email": "<string>",
  "agent_name": "<string>",
  "notify_me_when_done": true,
  "notify_results_to_audited_people": false
}
```

All nine fields are always present and typed as above. One request = one agent; the platform sends multiple requests (one per selected agent) with a 2-second delay between them.
