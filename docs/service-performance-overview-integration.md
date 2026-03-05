# Using "Service Performance overview" from a different database

The **pull conversations** flow can use the **Service Performance overview** table that lives in a **different database**. This guide explains how to wire it.

---

## 1. Table shape (from your export)

From `service-performance-overview-100.json`, each row looks like:

| Column / field      | Type   | Use in app |
|---------------------|--------|------------|
| `id`                | number | Internal row id (optional in payload) |
| `conversation_id`   | string | **Conversation id** (maps to `conversation.id`) |
| `assignee_id`       | string | **Admin/agent id** (filter by this = `admin_id`) |
| `assignee_name`     | string | Agent display name |
| `updated_at`        | string (ISO) | **Time range filter** (`updated_at` between start/end) |
| `created_at`        | string (ISO) | For display / sorting |
| `state`             | string | e.g. "Closed" (maps to `conversation.state`) |
| `channel`           | string | e.g. "Chat" |
| `country`           | string | Contact country |
| `Transcript`        | string (JSON) | Array of `{ role, author, body, time }` – used to build `source` |
| `csat_rating`       | number/null | Maps to conversation rating |
| `CX score`          | number/null | Maps to CX score |
| `tags`              | varies | Tags if present |
| …                   | …      | Other columns as needed |

The create-audit UI expects objects with: `id`, `source.subject`, `source.author.name`, `source.author.email`, `state`, `created_at`, `updated_at`, `conversation_rating.rating`, `custom_attributes` / `cx_score`, etc. So we need to **map** each Service Performance overview row into that shape (see section 3).

---

## 2. Two ways to use the other database

Because the table is in a **different database**, the app cannot query it directly from the browser. Use one of these:

### Option A: Sync into Supabase (recommended)

1. **ETL/sync job** (scheduled or on-demand) that:
   - Connects to the **other database**.
   - Reads from **"Service Performance overview"** (or the exact table name, e.g. with spaces: `"Service Performance overview"` in double quotes in PostgreSQL).
   - Filters by `assignee_id` and `updated_at` if you want to limit what you copy, or sync the full table.
   - Inserts/upserts into Supabase table **`public.conversations`** with:
     - `id` = `conversation_id`
     - `admin_id` = `assignee_id`
     - `updated_at` = `updated_at`
     - `payload` = **mapped object** (see section 3).

2. **Frontend**: No change. It already queries `conversations` by `admin_id` and `updated_at` range.

You can run the ETL from:
- A cron job (e.g. GitHub Actions, Azure Function, AWS Lambda),
- A small Node/TS script that uses a Postgres/MySQL client for the other DB and the Supabase client to write to `conversations`,
- Or any ETL tool that can read from one DB and write to Supabase.

### Option B: API + Edge Function (no sync)

1. **Expose the other database via an HTTP API** that:
   - Accepts query params (or body): e.g. `admin_id` (or `assignee_id`), `updated_since`, `updated_before`.
   - Returns JSON array of rows from **"Service Performance overview"** (or a view) for that assignee and time range.

2. **Supabase Edge Function** (e.g. `conversations-from-service-performance`):
   - Reads `SERVICE_PERFORMANCE_API_URL` (and auth if needed) from env.
   - Calls that API with the request’s `admin_id` and date range.
   - Maps each row to the conversation shape (section 3).
   - Returns `{ conversations: [...] }`.

3. **Frontend**: Call this Edge Function instead of querying Supabase `conversations` (same query params: admin_id, date range). You’d swap the current Supabase `from('conversations')` call for a `fetch(edgeFunctionUrl, ...)`.

---

## 3. Mapping a row → conversation payload

Use this shape so the existing create-audit UI (tables, filters, Review, Audit) keeps working.

```ts
// Pseudocode: map one "Service Performance overview" row to conversation payload
function mapServicePerformanceRowToConversation(row: ServicePerformanceRow): ConversationPayload {
  const transcript = safeParseJSON(row.Transcript);
  const firstUser = Array.isArray(transcript) ? transcript.find((m: any) => m.role === 'USER') : null;
  const subject = firstUser?.body?.substring(0, 80) || row.channel || 'No subject';
  const clientName = firstUser?.author || 'Unknown';

  return {
    id: row.conversation_id,
    state: (row.state || '').toLowerCase(),
    created_at: row.created_at,
    updated_at: row.updated_at,
    source: {
      subject,
      body: firstUser?.body ?? '',
      type: (row.channel || 'conversation').toLowerCase(),
      author: {
        name: clientName,
        email: null,
      },
    },
    conversation_rating: row.csat_rating != null ? { rating: row.csat_rating } : undefined,
    custom_attributes: {
      'CX Score rating': row['CX score'] ?? null,
    },
    statistics: {
      time_to_admin_reply: row.frt_seconds != null ? row.frt_seconds * 60 : undefined,
      count_reopens: row.reopened_count ?? 0,
    },
    participation_part_count: row.response_count ?? 0,
    admin_assignee_id: row.assignee_id,
    assignee_name: row.assignee_name,
    country: row.country,
    channel: row.channel,
    tags: row.tags,
    // Keep raw Transcript if the UI or audit view needs it
    Transcript: row.Transcript,
  };
}
```

- **Filtering in the app** uses `admin_id` = `assignee_id` and `updated_at` range; the payload is for display and actions.
- If your table or API uses different column names (e.g. `assignee_id` vs `admin_id`), use the names from your DB in the mapping and only set `id` / `admin_id` / `updated_at` / `payload` as required by the Supabase `conversations` table or by the Edge Function response.

---

## 4. What you need to provide

To implement either option, we need:

1. **Other database**
   - Type (PostgreSQL, MySQL, SQL Server, etc.).
   - How the app is allowed to access it:
     - **Option A**: Connection string (or host, port, database, user, password) for the ETL process only (not in the browser).
     - **Option B**: Base URL (and auth) of an HTTP API that returns "Service Performance overview" rows for a given assignee and date range.

2. **Exact table/API**
   - Exact table name (e.g. `"Service Performance overview"` with spaces, or `service_performance_overview`).
   - Exact column names for: conversation id, assignee/admin id, updated_at, created_at, state, Transcript, csat_rating, CX score (and any others you want in the UI).

3. **Admin id alignment**
   - The create-audit page resolves **admin_id** from employee email (Intercom admin cache or API). Your **assignee_id** in Service Performance overview must match that same id (Intercom teammate id), or you need a mapping table (e.g. email → assignee_id) in the ETL or API.

Once you have:
- **Option A**: A script or pipeline that reads from the other DB and writes mapped rows into `public.conversations` (with the mapping above).
- **Option B**: The API URL and auth; then we can add the Edge Function and point the frontend to it.

If you tell me which option you prefer and how you access the other DB (connection string vs API URL), I can outline the exact steps or code next (e.g. ETL script stub or Edge Function).

---

## 5. Reusable mapping in this repo

The file **`src/features/create-audit/utils/map-service-performance-to-conversation.ts`** provides:

- **`mapServicePerformanceRowToConversation(row)`** – maps one Service Performance overview row to the conversation payload the UI expects.
- **`servicePerformanceRowToConversationsTable(row)`** – returns `{ id, admin_id, updated_at, payload }` for inserting into Supabase **`public.conversations`** (for Option A).

Use these in your ETL script (Node/TS) or in a Supabase Edge Function that calls your other DB’s API (Option B).
