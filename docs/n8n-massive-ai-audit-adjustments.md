# Adjustments to Your n8n Workflow for CQMS Massive AI Audit

Your workflow is already close. Apply these changes so it matches the CQMS contract: **job_id** flows through, callback sends **massive_audit_job_id**, and the progress API is called when the agent is done.

---

## 1. Normalize Payload – add `job_id`

The CQMS platform sends **job_id** in every webhook body. Read it and pass it through.

**Replace the entire "Normalize Payload" Code node** with:

```javascript
// Normalize Payload (Webhook) — CQMS Massive AI Audit
// Expects: job_id, scorecard_id, start_date, end_date, intercom_admin_ids[], notify_*

const p = $json?.body ?? $json || {};

function requireField(k) {
  if (p[k] === undefined || p[k] === null || String(p[k]).trim() === "") {
    throw new Error(`Missing required field: ${k}`);
  }
  return p[k];
}

const job_id = String(p.job_id ?? p.jobId ?? "").trim();
if (!job_id) throw new Error("Missing required field: job_id");

const scorecard_id = String(requireField("scorecard_id")).trim();
const start_date   = String(requireField("start_date")).trim();
const end_date     = String(requireField("end_date")).trim();

const intercom_admin_ids = Array.isArray(p.intercom_admin_ids)
  ? p.intercom_admin_ids.map(x => String(x).trim()).filter(Boolean)
  : [];

if (intercom_admin_ids.length === 0) {
  throw new Error("intercom_admin_ids must be a non-empty array");
}

const notify_me_when_done = Boolean(p.notify_me_when_done);
const notify_results_to_audited_people = Boolean(p.notify_results_to_audited_people);

const OFFSET_MS = 6 * 3600 * 1000;
function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function localDayToUtcRange(ymd, endOfDay) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  const shifted = utcMs - OFFSET_MS;
  return Math.floor(shifted / 1000);
}

if (!isYMD(start_date) || !isYMD(end_date)) {
  throw new Error("start_date/end_date must be YYYY-MM-DD");
}

let from_ts = localDayToUtcRange(start_date, false);
let to_ts   = localDayToUtcRange(end_date, true);
if (to_ts < from_ts) { const t = from_ts; from_ts = to_ts; to_ts = t; }

const run_id = `${scorecard_id}_${start_date}_${end_date}_${$execution.id}`;

return [{
  json: {
    job_id,
    scorecard_id,
    start_date,
    end_date,
    from_ts,
    to_ts,
    intercom_admin_ids,
    notify_me_when_done,
    notify_results_to_audited_people,
    run_id
  }
}];
```

---

## 2. New node: Inject job context (after Get row(s) in sheet)

Sheet rows don’t have **job_id** or **scorecard_id**. Add a Code node between **Get row(s) in sheet** and **Loop Over Items** so every item has CQMS context.

- **Name:** `Inject job context`
- **Type:** Code
- **Position:** between "Get row(s) in sheet" and "Loop Over Items"

**Code:**

```javascript
// Attach job_id, scorecard_id, audit_date, batch_id, employee_name to each sheet row for callback
const context = $('Explode Admin IDs').first().json;
const job_id = context.job_id;
const scorecard_id = context.scorecard_id;
const start_date = context.start_date || '';
const admin_id = context.adminId;

return $input.all().map(item => ({
  json: {
    ...item.json,
    job_id,
    scorecard_id,
    audit_date: start_date,
    batch_id: job_id,
    massive_audit_job_id: job_id,
    employee_name: item.json.agent_name || '',
    employee_email: item.json.employee_email || '',
    created_by: 'massive-ai-audit'
  }
}));
```

**Connections:**
- **Get row(s) in sheet** → **Inject job context** (replace direct link to Loop Over Items)
- **Inject job context** → **Loop Over Items**

---

## 3. Callback body – send `massive_audit_job_id`

So CQMS can link the assignment to the job, the callback body must include **massive_audit_job_id**.

**In the "Code" node that builds `HTTP_BODY` (before HTTP Request2), use:**

```javascript
const item = $input.first().json;

const HTTP_BODY = {
  conversation_id: item.conversation_id,
  scorecard_id: item.scorecard_id,
  audit_date: item.audit_date,
  employee_email: item.employee_email || '',
  employee_name: item.employee_name || '',
  batch_id: item.batch_id || item.job_id,
  massive_audit_job_id: item.massive_audit_job_id || item.job_id || item.batch_id,
  created_by: item.created_by || '',
  success: item.success,
  ai_scorecard_data: item.ai_scorecard_data,
  ai_confidence_score: item.ai_confidence_score,
  ai_notes: item.ai_notes
};

return [{ json: { HTTP_BODY } }];
```

---

## 4. New node: Progress PATCH (when agent is done)

When **Loop Over Items** has no more items (second output = “done”), call the CQMS progress API.

- **Name:** `Progress PATCH`
- **Type:** HTTP Request
- **Method:** PATCH
- **URL:** `https://YOUR_CQMS_API_URL/api/massive-ai-audit/jobs/{{ $('Explode Admin IDs').first().json.job_id }}/progress`  
  (replace `YOUR_CQMS_API_URL` with your app URL, e.g. `https://your-app.vercel.app` or `http://localhost:4000` for dev)
- **Headers:**
  - `x-massive-ai-audit-key`: `YOUR_MASSIVE_AI_AUDIT_SERVICE_KEY` (same value as in CQMS `.env`)
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "status": "completed",
  "completed_agents": 1,
  "completed_conversations": 0
}
```
(You can later set `completed_conversations` to the real count if you track it.)

**Connections:**
- **Loop Over Items** → first output (when loop is **done**, no more items) → **Progress PATCH**
- Keep **Loop Over Items** → second output → **AI Agent2** as now

In n8n, **Split In Batches** / **Loop Over Items** usually has:
- Output **0**: “done” (no more batches)
- Output **1**: current batch item

So: connect **output 0** (done) to **Progress PATCH**, and **output 1** to **AI Agent2**.

---

## 5. Summary

| What | Where |
|------|--------|
| **job_id** in payload | Normalize Payload reads `job_id` / `jobId` from webhook body and includes it in output. |
| **job_id** on sheet rows | New “Inject job context” Code node after Get row(s) in sheet adds job_id, scorecard_id, audit_date, batch_id, employee_name, massive_audit_job_id to each item. |
| **Callback** | Code node that builds HTTP_BODY includes `massive_audit_job_id` (and batch_id) so CQMS can link the assignment to the job. |
| **Progress** | New “Progress PATCH” HTTP node runs when the loop is done; call PATCH `/api/massive-ai-audit/jobs/:id/progress` with `x-massive-ai-audit-key`. |

Your existing flow (Intercom search, pagination, AggregateMetrics, Get conversation, Code3 transcript, Google Sheet, Merge, If1, AI Agent2, Parse AI Response, Mapping, callback) stays the same; only **Normalize Payload**, the **callback Code** node, and the two new nodes above are added/changed for CQMS.

---

## 6. Connection changes (n8n UI)

- **Get row(s) in sheet** → disconnect from **Loop Over Items**.
- **Get row(s) in sheet** → **Inject job context** (new).
- **Inject job context** → **Loop Over Items**.
- **Loop Over Items** → first output (done, no more items) → **Progress PATCH** (new).
- **Loop Over Items** → second output → **AI Agent2** (unchanged).
