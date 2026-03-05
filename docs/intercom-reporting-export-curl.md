# Intercom Reporting Data Export – cURL and attributes

From the [Dataset filters & conditions for SQL generation with LLMs](https://www.intercom.com/help/en/articles/12089688-dataset-filters-conditions-for-sql-generation-with-llms) doc and the [Reporting Data Export API](https://developers.intercom.com/docs/references/rest-api/api.intercom.io/reporting-data-export):

- **Datasets** mentioned for reporting/SQL: Teammate status period (`admin_status_change`), Calls (`call`), Calls team stats (`call_team_stats`, `call_teammate_stats`), **Conversation actions** (`consolidated_conversation_part`, filter on `first_user_conversation_part_created_at`).
- The **export API** uses its own dataset list (e.g. `conversation`). Valid **attribute_ids** must be **qualified_id** values returned by `GET /export/reporting_data/get_datasets` (e.g. `people.Brand`), not unqualified names like `conversation_id`.

Use **Step 1** to get the exact `qualified_id` list for the dataset you want, then **Step 2** to enqueue the export.

---

## Step 1: List datasets and attributes (get actual `qualified_id`s)

```bash
curl -X GET "https://api.intercom.io/export/reporting_data/get_datasets" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Intercom-Version: Unstable"
```

From the response, find the dataset you want (e.g. the one with `"id": "conversation"` or similar). Each item in `data[].attributes` should have a **`qualified_id`** (or similar) field. Use those **exact** strings in Step 2 as `attribute_ids`. Copy the full JSON if you need to share it.

---

## Step 2: Enqueue a reporting data export (use date range within last 2 years)

Replace `QUALIFIED_ID_1`, `QUALIFIED_ID_2`, … with the **exact** `qualified_id` values from the Step 1 response for that dataset. Use a **recent** date range (start/end within the last 2 years).

```bash
curl -X POST "https://api.intercom.io/export/reporting_data/enqueue" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: Unstable" \
  -d "{
    \"start_time\": 1739750400,
    \"end_time\": 1740355200,
    \"dataset_id\": \"conversation\",
    \"attribute_ids\": [\"QUALIFIED_ID_1\", \"QUALIFIED_ID_2\"]
  }"
```

- `1739750400` = 2025-02-17 00:00:00 UTC  
- `1740355200` = 2025-02-24 00:00:00 UTC  

Save the **`job_identifier`** from the response for status and download.

---

## Step 3: Get export job status

Replace `JOB_IDENTIFIER`, `CLIENT_ID`, and `APP_ID`.

```bash
curl -X GET "https://api.intercom.io/export/reporting_data/JOB_IDENTIFIER?job_identifier=JOB_IDENTIFIER&client_id=CLIENT_ID&app_id=APP_ID" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Intercom-Version: Unstable"
```

---

## Step 4: Download completed export

Replace `JOB_IDENTIFIER` and `APP_ID`. Requires `Accept: application/octet-stream`.

```bash
curl -X GET "https://api.intercom.io/download/reporting_data/JOB_IDENTIFIER?job_identifier=JOB_IDENTIFIER&app_id=APP_ID" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Accept: application/octet-stream" \
  -H "Intercom-Version: Unstable" \
  -o reporting_export.gz
```

---

## Summary

- **Actual attributes** for the export API are **only** what `get_datasets` returns (as `qualified_id` or the field your response uses for the “e.g. people.Brand” style IDs).
- The 12089688 doc describes **reporting datasets and filters for SQL/LLMs** (tables, date fields, conditions); the **export API** is separate and uses `get_datasets` for valid dataset and attribute IDs.
- Always use **Step 1** first, then copy the listed `qualified_id` values into **Step 2** `attribute_ids`.
