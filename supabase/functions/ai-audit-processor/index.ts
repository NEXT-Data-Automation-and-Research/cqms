// Supabase Edge Function to process AI audits via n8n
// This function creates audit assignments and sends them to n8n for AI processing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || 'https://n8nnextventures.xyz/webhook/22648ca5-9b72-4d20-83da-879fd163b66e'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
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
      console.log('📥 Received request body:', {
        conversations_count: body.conversations?.length || 0,
        employee_email: body.employee_email,
        employee_name: body.employee_name,
        scorecard_id: body.scorecard_id,
        audit_date: body.audit_date,
        auditor_email: body.auditor_email
      })
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
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
      console.error('❌ Validation error: Missing required fields', {
        has_employee_email: !!employee_email,
        has_scorecard_id: !!scorecard_id,
        has_audit_date: !!audit_date
      })
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
    let userInfo = {}
    try {
      userInfo = JSON.parse(userInfoHeader)
    } catch (e) {
      console.warn('⚠️ Could not parse x-user-info header:', userInfoHeader)
    }
    const createdBy = auditor_email || userInfo.email || 'system'
    console.log(`👤 Created by: ${createdBy}`)

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
    console.log(`📋 Sample conversation payload:`, conversationsPayload[0] || 'none')
    
    const n8nPayload = {
      conversations: conversationsPayload,
      batch_id: batchId,
      callback_url: callbackUrl
    }
    
    console.log(`📦 Payload prepared (size: ${JSON.stringify(n8nPayload).length} bytes)`)
    console.log(`📤 Sending ${conversations.length} conversations to n8n webhook via POST`)
    console.log(`🔗 Webhook URL: ${N8N_WEBHOOK_URL}`)
    
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
        console.error('❌ n8n webhook error response:', {
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          error: errorText,
          url: N8N_WEBHOOK_URL
        })
        throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`)
      }

      const responseText = await n8nResponse.text()
      console.log('✅ Successfully sent to n8n webhook')
      console.log(`📥 n8n response:`, responseText || '(empty response)')
      
    } catch (fetchError) {
      console.error('❌ Error calling n8n webhook:', {
        error: fetchError.message,
        error_name: fetchError.name,
        error_type: fetchError.constructor.name,
        stack: fetchError.stack,
        url: N8N_WEBHOOK_URL,
        payload_size: JSON.stringify(n8nPayload).length,
        timestamp: new Date().toISOString()
      })
      
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('❌ Error in ai-audit-processor:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    })
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack || 'No stack trace available'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
