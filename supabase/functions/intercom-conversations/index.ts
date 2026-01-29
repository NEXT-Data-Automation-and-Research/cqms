// Intercom Conversations Edge Function
// Secure, authenticated proxy for fetching Intercom conversations
// Only allows access to conversations for assigned employees

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const INTERCOM_API_BASE = 'https://api.intercom.io'
const MAX_CONVERSATIONS = 150
const EDGE_FUNCTION_TIMEOUT = 60000 // 60 seconds
const BATCH_SIZE = 10 // Process 10 conversations at a time

/**
 * CORS configuration
 *
 * SECURITY: Do NOT use `Access-Control-Allow-Origin: *` for authenticated endpoints.
 *
 * Configure allowed origins via `ALLOWED_ORIGINS` (comma-separated), e.g.:
 * - https://app.yourdomain.com,https://staging.yourdomain.com,http://localhost:5173
 *
 * Non-breaking fallback:
 * - If `ALLOWED_ORIGINS` is not set, we reflect the request Origin (still permissive,
 *   but avoids wildcard and supports current clients).
 */
function parseAllowedOrigins(): Set<string> {
  const raw = Deno.env.get('ALLOWED_ORIGINS') || ''
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return new Set(origins)
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  // Requests from non-browsers (no Origin header) don't need CORS.
  if (!origin) return {}

  const allowed = parseAllowedOrigins()

  // Non-breaking default: reflect origin when allowlist isn't configured yet.
  // To harden further, set ALLOWED_ORIGINS in Supabase dashboard.
  const allowOrigin = allowed.size === 0 ? origin : (allowed.has(origin) ? origin : '')

  // If origin isn't allowed, return no CORS headers (browser will block).
  if (!allowOrigin) return { 'Vary': 'Origin' }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

// Get Intercom access token from environment (set in Supabase dashboard)
const INTERCOM_ACCESS_TOKEN = Deno.env.get('INTERCOM_ACCESS_TOKEN')
if (!INTERCOM_ACCESS_TOKEN) {
  console.error('❌ INTERCOM_ACCESS_TOKEN environment variable not set')
}

interface ConversationPart {
  id: string
  author?: {
    type: string
    id: string | number
  }
  created_at?: number | string
}

interface Conversation {
  id: string
  created_at?: number
  updated_at?: number
  conversation_parts?: ConversationPart[] | {
    conversation_parts?: ConversationPart[]
    parts?: ConversationPart[]
  }
}

/**
 * Validate JWT token and get user email
 */
async function validateAuth(authHeader: string | null): Promise<{ email: string; userId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  if (!token) {
    return null
  }

  try {
    // Create Supabase client with service role to verify JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing')
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('❌ Invalid token:', error?.message)
      return null
    }

    return {
      email: user.email || '',
      userId: user.id
    }
  } catch (error) {
    console.error('❌ Error validating auth:', error)
    return null
  }
}

/**
 * Check if user has permission to access conversations for this employee
 * User must be assigned as auditor for this employee in audit_assignments
 */
async function checkPermission(
  userEmail: string,
  employeeEmail: string
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return false
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if user is assigned as auditor for this employee
    const { data, error } = await supabase
      .from('audit_assignments')
      .select('id')
      .eq('auditor_email', userEmail)
      .eq('employee_email', employeeEmail)
      .in('status', ['pending', 'in_progress', 'completed'])
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error checking permission:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('❌ Error checking permission:', error)
    return false
  }
}

/**
 * Get Intercom admin ID for employee email
 */
async function getIntercomAdminId(employeeEmail: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Try people table first
    const { data: peopleData } = await supabase
      .from('people')
      .select('intercom_admin_id')
      .eq('email', employeeEmail)
      .maybeSingle()

    if (peopleData?.intercom_admin_id) {
      return String(peopleData.intercom_admin_id)
    }

    // Fallback to users table
    const { data: usersData } = await supabase
      .from('users')
      .select('intercom_admin_id')
      .eq('email', employeeEmail)
      .maybeSingle()

    if (usersData?.intercom_admin_id) {
      return String(usersData.intercom_admin_id)
    }

    return null
  } catch (error) {
    console.error('❌ Error getting Intercom admin ID:', error)
    return null
  }
}

/**
 * Fetch a single conversation with parts
 */
async function fetchConversationWithParts(conversationId: string): Promise<Conversation | null> {
  try {
    const url = `${INTERCOM_API_BASE}/conversations/${conversationId}?display_as=plaintext`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Intercom-Version': '2.14',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`  ❌ Failed to fetch conversation ${conversationId}: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    
    if (!data.conversation_parts) {
      console.warn(`  ⚠️  Conversation ${conversationId} has no conversation_parts field`)
    }
    
    return data
  } catch (error) {
    console.error(`  ❌ Error fetching conversation ${conversationId}:`, error)
    return null
  }
}

/**
 * Check if conversation has admin participation
 */
function hasAdminParticipation(
  conversation: Conversation,
  adminId: string,
  startTimestamp: number,
  endTimestamp: number
): { hasParticipation: boolean; partCount: number } {
  let parts: ConversationPart[] = []
  
  if (conversation.conversation_parts) {
    if (Array.isArray(conversation.conversation_parts)) {
      parts = conversation.conversation_parts
    } else if (typeof conversation.conversation_parts === 'object') {
      const partsObj = conversation.conversation_parts as any
      if (Array.isArray(partsObj.conversation_parts)) {
        parts = partsObj.conversation_parts
      } else if (Array.isArray(partsObj.parts)) {
        parts = partsObj.parts
      }
    }
  }

  let partCount = 0

  for (const part of parts) {
    const author = part.author || {}
    const authorType = author.type
    const authorId = author.id ? String(author.id) : null

    if (!authorId) continue

    let partTimestamp: number | null = null
    if (part.created_at) {
      if (typeof part.created_at === 'number') {
        partTimestamp = part.created_at < 10000000000 
          ? part.created_at 
          : Math.floor(part.created_at / 1000)
      } else {
        partTimestamp = Math.floor(new Date(part.created_at).getTime() / 1000)
      }
    }

    if (!partTimestamp) continue

    const isAdmin = authorType === 'admin'
    const adminIdStr = String(adminId)
    const adminIdNum = parseInt(adminId, 10)
    const authorIdNum = parseInt(authorId, 10)
    const isTargetAdmin = authorId === adminIdStr || (!isNaN(adminIdNum) && !isNaN(authorIdNum) && authorIdNum === adminIdNum)
    const isInDateRange = partTimestamp >= startTimestamp && partTimestamp <= endTimestamp

    if (isAdmin && isTargetAdmin && isInDateRange) {
      partCount++
    }
  }

  return {
    hasParticipation: partCount > 0,
    partCount
  }
}

serve(async (req) => {
  const startTime = Date.now()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(req),
    })
  }

  try {
    const baseHeaders = corsHeaders(req)

    // SECURITY: Validate authentication
    const authHeader = req.headers.get('authorization')
    const user = await validateAuth(authHeader)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing authentication token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...baseHeaders,
          },
        }
      )
    }

    const url = new URL(req.url)
    const employeeEmail = url.searchParams.get('employee_email')
    const updatedDate = url.searchParams.get('updated_date')
    const updatedSince = url.searchParams.get('updated_since')
    const updatedBefore = url.searchParams.get('updated_before')

    // SECURITY: Validate required parameters
    if (!employeeEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: employee_email' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...baseHeaders,
          },
        }
      )
    }

    // SECURITY: Check permission - user must be assigned as auditor for this employee
    const hasPermission = await checkPermission(user.email, employeeEmail)
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden: You do not have permission to access conversations for this employee' 
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...baseHeaders,
          },
        }
      )
    }

    // Get Intercom admin ID for this employee
    const adminId = await getIntercomAdminId(employeeEmail)
    if (!adminId) {
      return new Response(
        JSON.stringify({ 
          error: 'Intercom admin ID not found for this employee. Please ensure the employee has an intercom_admin_id set.' 
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...baseHeaders,
          },
        }
      )
    }

    // Parse date range
    let since: number
    let before: number
    
    if (updatedDate) {
      const [year, month, day] = updatedDate.split('-').map(Number)
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
      const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
      since = Math.floor(start.getTime() / 1000)
      before = Math.floor(end.getTime() / 1000)
    } else if (updatedSince && updatedBefore) {
      const sinceNum = Number(updatedSince)
      const beforeNum = Number(updatedBefore)
      if (!isNaN(sinceNum) && !isNaN(beforeNum)) {
        since = sinceNum
        before = beforeNum
      } else {
        const sinceDate = new Date(updatedSince)
        const beforeDate = new Date(updatedBefore)
        since = Math.floor(sinceDate.getTime() / 1000)
        before = Math.floor(beforeDate.getTime() / 1000)
      }
    } else {
      const today = new Date()
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0))
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59))
      since = Math.floor(start.getTime() / 1000)
      before = Math.floor(end.getTime() / 1000)
    }

    const startingAfter = url.searchParams.get('starting_after')
    
    console.log(`📞 Fetching conversations: employee=${employeeEmail}, admin=${adminId}, date=${updatedDate || 'today'}`)

    // Search for conversations using Intercom Search API
    const adminIdStr = String(adminId)
    const searchQuery: any = {
      query: {
        operator: "AND",
        value: [
          { field: "teammate_ids", operator: "=", value: adminIdStr },
          { field: "updated_at", operator: ">=", value: since },
          { field: "updated_at", operator: "<=", value: before }
        ]
      },
      pagination: {
        per_page: MAX_CONVERSATIONS
      }
    }
    
    if (startingAfter) {
      searchQuery.pagination.starting_after = startingAfter
    }

    const searchUrl = `${INTERCOM_API_BASE}/conversations/search`
    
    // Retry logic for 500 errors
    let searchResponse: Response | null = null
    let lastError: Error | null = null
    const maxRetries = 3
    const retryDelay = 1000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Intercom-Version': '2.14',
          },
          body: JSON.stringify(searchQuery),
        })

        if (searchResponse.ok) {
          break
        }

        if (searchResponse.status === 500 && attempt < maxRetries) {
          const errorText = await searchResponse.text()
          console.warn(`⚠️  Search API returned 500 (attempt ${attempt}/${maxRetries}), retrying...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          continue
        }

        const errorText = await searchResponse.text()
        throw new Error(`Intercom Search API error (${searchResponse.status}): ${errorText}`)
      } catch (error) {
        lastError = error as Error
        if (attempt === maxRetries) {
          throw error
        }
        console.warn(`⚠️  Search API request failed (attempt ${attempt}/${maxRetries}), retrying...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }

    if (!searchResponse || !searchResponse.ok) {
      throw lastError || new Error('Failed to fetch conversations after retries')
    }

    const searchData = await searchResponse.json()
    let conversationIds = (searchData.conversations || []).map((c: any) => c.id)
    const intercomTotalCount = searchData.total_count || conversationIds.length
    
    const searchPages = searchData.pages || {}
    let hasMorePages = false
    let nextCursor = null
    
    if (searchPages.next?.starting_after) {
      nextCursor = searchPages.next.starting_after
      hasMorePages = true
    } else if (searchPages.next?.cursor) {
      nextCursor = searchPages.next.cursor
      hasMorePages = true
    }
    
    conversationIds = conversationIds.slice(0, MAX_CONVERSATIONS)

    if (conversationIds.length === 0) {
      return new Response(
        JSON.stringify({
          type: 'conversation.list',
          conversations: [],
          total_count: 0,
          intercom_total_count: intercomTotalCount,
          has_more: false,
          pages: searchData.pages || null,
          employee_email: employeeEmail,
          date: updatedDate || new Date().toISOString().split('T')[0],
          participation_count: 0
        }, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...baseHeaders,
          },
        }
      )
    }

    // Fetch individual conversations and filter by participation
    console.log(`🔄 Fetching ${conversationIds.length} conversations to check participation...`)
    const conversationsWithParticipation: any[] = []
    let totalParticipationCount = 0
    let processedCount = 0
    let errorCount = 0

    for (let i = 0; i < conversationIds.length; i += BATCH_SIZE) {
      const elapsed = Date.now() - startTime
      if (elapsed > EDGE_FUNCTION_TIMEOUT - 5000) {
        console.log(`⏰ Timeout approaching, stopping at ${processedCount} conversations`)
        break
      }

      const batch = conversationIds.slice(i, i + BATCH_SIZE)
      console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: conversations ${i + 1}-${Math.min(i + BATCH_SIZE, conversationIds.length)}`)

      const batchPromises = batch.map(id => fetchConversationWithParts(id))
      const batchResults = await Promise.all(batchPromises)

      for (const conversation of batchResults) {
        if (!conversation) {
          errorCount++
          continue
        }

        processedCount++
        const participation = hasAdminParticipation(conversation, adminIdStr, since, before)

        if (participation.hasParticipation) {
          totalParticipationCount += participation.partCount
          conversationsWithParticipation.push({
            id: conversation.id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            created_at_iso: conversation.created_at ? new Date(conversation.created_at * 1000).toISOString() : null,
            updated_at_iso: conversation.updated_at ? new Date(conversation.updated_at * 1000).toISOString() : null,
            participation_part_count: participation.partCount,
            ...conversation
          })
        }
      }

      if (i + BATCH_SIZE < conversationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ Completed: ${conversationsWithParticipation.length} conversations with participation out of ${processedCount} processed`)

    return new Response(
      JSON.stringify({
        type: 'conversation.list',
        conversations: conversationsWithParticipation,
        total_count: conversationsWithParticipation.length,
        intercom_total_count: intercomTotalCount,
        has_more: hasMorePages || conversationIds.length >= MAX_CONVERSATIONS,
        pages: searchData.pages || null,
        next_cursor: nextCursor,
        employee_email: employeeEmail,
        date: updatedDate || new Date().toISOString().split('T')[0],
        participation_count: totalParticipationCount,
        processed_count: processedCount,
        error_count: errorCount
      }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders,
        },
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(req),
        },
      }
    )
  }
})

