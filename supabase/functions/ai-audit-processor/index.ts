// Supabase Edge Function to process AI audits via n8n
// This function creates audit assignments and sends them to n8n for AI processing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY: No fallback - require N8N_WEBHOOK_URL to be set in Supabase secrets
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

// CORS: use CORS_ALLOWED_ORIGINS (comma-separated) in Supabase secrets. If unset, use * so existing deployments don't break.
const CORS_ALLOWED_ORIGINS_RAW = Deno.env.get('CORS_ALLOWED_ORIGINS') ?? ''
const CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS_RAW ? CORS_ALLOWED_ORIGINS_RAW.split(',').map((s) => s.trim()).filter(Boolean) : []
const CORS_USE_WILDCARD = CORS_ALLOWED_ORIGINS.length === 0

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  let allowOrigin = '*'
  if (!CORS_USE_WILDCARD && CORS_ALLOWED_ORIGINS.length > 0) {
    if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) allowOrigin = origin
    else if (!origin) allowOrigin = CORS_ALLOWED_ORIGINS[0]
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

/** Redact PII for logging: do not log emails, names, or conversation content. */
function redactForLog<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase().includes('email') || k.toLowerCase().includes('name') || k === 'created_by' || k === 'auditor_email' || k === 'employee_name' || k === 'employee_email') {
      out[k] = v != null && String(v).length > 0 ? '[REDACTED]' : v
    } else {
      out[k] = v
    }
  }
  return out
}

interface Conversation {
  id: string
  [key: string]: any
}

interface RequestBody {
  conversations: Conversation[]
  employee_email: string
  employee_name: string
  scorecard_id: string
  audit_date: string // YYYY-MM-DD format
  auditor_email: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    })
  }

  try {
    // Check n8n webhook URL
    if (!N8N_WEBHOOK_URL) {
      console.error('N8N_WEBHOOK_URL is not set!')
      throw new Error('N8N_WEBHOOK_URL environment variable is not set')
    }

    // Get Supabase client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Parse request body
    let body: RequestBody
    try {
      body = await req.json()
      // SECURITY: Log only non-PII metadata; do not log emails, names, or conversation content
      console.log('📥 Received request:', redactForLog({
        conversations_count: body.conversations?.length || 0,
        scorecard_id: body.scorecard_id,
        audit_date: body.audit_date
      }))
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : 'Parse error'
      console.error('❌ Error parsing request body:', msg)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { conversations, employee_email, employee_name, scorecard_id, audit_date, auditor_email } = body

    if (!conversations || conversations.length === 0) {
      console.error('❌ Validation error: Missing or empty conversations array')
      return new Response(
        JSON.stringify({ error: 'Missing required field: conversations' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!employee_email || !scorecard_id || !audit_date) {
      console.error('❌ Validation error: Missing required fields (employee_email, scorecard_id, audit_date)')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employee_email, scorecard_id, audit_date' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Processing ${conversations.length} conversations for AI audit`)

    // Generate batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`🆔 Generated batch ID: ${batchId}`)

    // Get current user info for created_by
    const userInfoHeader = req.headers.get('x-user-info') || '{}'
    let userInfo: { email?: string } = {}
    try {
      userInfo = JSON.parse(userInfoHeader) as { email?: string }
    } catch (e) {
      console.warn('⚠️ Could not parse x-user-info header')
    }
    const createdBy = auditor_email || userInfo.email || 'system'
    // SECURITY: Do not log email/PII
    console.log('👤 Request has created_by (redacted)')

    // NO assignments created here - we'll create them later when user clicks "Start Audit"
    // Just prepare data to send to n8n

    // Prepare data for n8n webhook (matching your existing format)
    const callbackUrl = `${SUPABASE_URL}/functions/v1/ai-audit-callback`
    console.log(`🔗 Callback URL: ${callbackUrl}`)
    
    const conversationsPayload = conversations.map((conversation) => ({
      conversation_id: conversation.id,
      // No assignment_id - assignments created later when user chooses
      scorecard_id: scorecard_id,
      audit_date: audit_date,
      employee_email: employee_email,
      employee_name: employee_name,
      created_by: createdBy
    }))
    
    console.log(`📋 Prepared ${conversationsPayload.length} conversation payloads`)
    // SECURITY: Do not log payload content (may contain PII); log only structure
    console.log('📋 Payload keys per item:', conversationsPayload[0] ? Object.keys(conversationsPayload[0]).join(', ') : 'none')
    
    const n8nPayload = {
      conversations: conversationsPayload,
      batch_id: batchId,
      callback_url: callbackUrl
    }
    
    console.log(`📦 Payload prepared (size: ${JSON.stringify(n8nPayload).length} bytes)`)
    console.log(`📤 Sending ${conversations.length} conversations to n8n webhook via POST`)
    // SECURITY: Do not log webhook URL (sensitive)
    console.log('🔗 Webhook configured')
    
    try {
      console.log(`🚀 Initiating POST to n8n webhook...`)
      const fetchStartTime = Date.now()
      
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      })
      
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`⏱️ Fetch completed in ${fetchDuration}ms`)

      console.log(`📡 n8n response status: ${n8nResponse.status} ${n8nResponse.statusText}`)

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text()
        // SECURITY: Log status only; do not log response body (may contain PII)
        console.error('❌ n8n webhook error:', n8nResponse.status, n8nResponse.statusText)
        throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`)
      }

      await n8nResponse.text() // consume body
      console.log('✅ Successfully sent to n8n webhook')
      // SECURITY: Do not log n8n response body (may contain PII/AI output)
      
    } catch (fetchError) {
      // SECURITY: Log error details but not URL or payload content
      console.error('❌ Error calling n8n webhook:', fetchError.message, 'payload_size:', JSON.stringify(n8nPayload).length)
      
      // Check if it's a network error
      if (fetchError.message.includes('fetch')) {
        console.error('🌐 Network error detected - check if n8n webhook is accessible')
      }
      
      throw new Error(`Failed to call n8n webhook: ${fetchError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batchId,
        conversations_sent: conversations.length,
        message: 'AI audit processing started. Results will be stored when processing completes.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
      }
    )

  } catch (error) {
    // SECURITY: Log error message only; avoid logging stack in production (may leak paths)
    console.error('❌ Error in ai-audit-processor:', error?.message ?? String(error))
    return new Response(
      JSON.stringify({
        error: error?.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
      }
    )
  }
})
