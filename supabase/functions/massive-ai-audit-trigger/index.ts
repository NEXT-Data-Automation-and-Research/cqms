/**
 * Massive AI Audit Trigger – Supabase Edge Function
 * Forwards single-agent payload to n8n webhook. Invoked by the CQMS API (one call per agent, 2s apart).
 * n8n URL is kept here (not in app env).
 */

const N8N_WEBHOOK_URL = "https://n8nnextventures.xyz/webhook/cc0ff8a5-3021-445d-b88e-7cb70d44631b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!body || typeof body !== "object") {
    return new Response(
      JSON.stringify({ success: false, error: "Body must be a JSON object" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload = body as Record<string, unknown>;
  console.log("[massive-ai-audit-trigger] Received payload:", JSON.stringify(payload));

  const jobId = payload.job_id ?? payload.jobId;
  const intercomAdminIds = payload.intercom_admin_ids ?? payload.intercomAdminIds;
  if (!jobId) {
    return new Response(
      JSON.stringify({ success: false, error: "job_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!Array.isArray(intercomAdminIds) || intercomAdminIds.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "intercom_admin_ids must be a non-empty array" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("[massive-ai-audit-trigger] Sending to n8n:", N8N_WEBHOOK_URL);
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = n8nResponse.headers.get("content-type") ?? "";
    let result: unknown;
    if (contentType.includes("application/json")) {
      try {
        result = await n8nResponse.json();
      } catch {
        result = await n8nResponse.text();
      }
    } else {
      result = await n8nResponse.text();
    }

    if (n8nResponse.ok) {
      console.log("[massive-ai-audit-trigger] n8n send SUCCESS status=" + n8nResponse.status + " result=" + JSON.stringify(result));
    } else {
      console.log("[massive-ai-audit-trigger] n8n send FAILED status=" + n8nResponse.status + " result=" + JSON.stringify(result));
    }

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: typeof result === "string" ? result : (result as Record<string, unknown>)?.message ?? "n8n request failed",
          status: n8nResponse.status,
        }),
        { status: n8nResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.log("[massive-ai-audit-trigger] n8n request ERROR:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
