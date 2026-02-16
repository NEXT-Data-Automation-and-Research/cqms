/**
 * ai-audit-callback – Supabase Edge Function
 * Receives one AI audit result per conversation from n8n.
 * Writes ONLY to massive_ai_audit_results — completely separate from manual audit tables.
 * Does NOT touch audit_assignments or scorecard tables.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ success: false, error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ success: false, error: "Invalid JSON" }, 400);
  }

  const {
    conversation_id,
    scorecard_id,
    audit_date,
    employee_email,
    employee_name,
    massive_audit_job_id,
    created_by,
    success,
    ai_scorecard_data,
    ai_confidence_score,
    ai_notes,
    final_score,
    parameters_result,
  } = body as Record<string, any>;

  // Validate required fields
  if (!scorecard_id) return jsonResp({ success: false, error: "scorecard_id required" }, 400);
  if (!conversation_id) return jsonResp({ success: false, error: "conversation_id required" }, 400);
  if (!massive_audit_job_id) return jsonResp({ success: false, error: "massive_audit_job_id required" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("[ai-audit-callback] Received:", JSON.stringify({
    conversation_id, scorecard_id, massive_audit_job_id, employee_email,
  }));

  // --- Determine pass/fail from scorecard_data ---
  let passFail: string = "n/a";
  if (typeof ai_scorecard_data === "object" && ai_scorecard_data) {
    // Check if any fail_all parameter was violated (measurement > 0)
    // This is a simple heuristic; the actual logic depends on scorecard config
    const hasData = Object.keys(ai_scorecard_data).length > 0;
    if (hasData) {
      passFail = (final_score ?? 0) >= 80 ? "passed" : "failed";
    }
  }

  // --- Insert into massive_ai_audit_results ---
  const row = {
    job_id: massive_audit_job_id,
    conversation_id: String(conversation_id),
    scorecard_id: String(scorecard_id),
    employee_email: employee_email ?? "",
    employee_name: employee_name ?? "",
    audit_date: audit_date ?? null,
    scorecard_data: ai_scorecard_data ?? {},
    final_score: final_score ?? 0,
    confidence_score: ai_confidence_score ?? 0,
    ai_notes: ai_notes ?? null,
    parameters_result: parameters_result ?? [],
    status: success === false ? "failed" : "completed",
    pass_fail: passFail,
    created_by: created_by ?? "massive-ai-audit",
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("massive_ai_audit_results")
    .insert(row)
    .select("id")
    .single();

  if (insertErr) {
    console.error("[ai-audit-callback] massive_ai_audit_results insert error:", insertErr.message);
    return jsonResp({ success: false, error: "Insert failed: " + insertErr.message }, 500);
  }

  console.log("[ai-audit-callback] massive_ai_audit_results inserted:", inserted?.id);

  return jsonResp({
    success: true,
    result_id: inserted?.id,
  });
});
