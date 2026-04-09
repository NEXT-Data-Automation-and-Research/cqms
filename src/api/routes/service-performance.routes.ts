/**
 * Service Performance Routes
 * Queries "Service Performance Overview" (Chat) and
 * "Email - Service Performance Overview" (Email) tables from CEx Insights
 * Supabase and returns combined data for the create-audit conversations table.
 */

import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const router = Router();

const CHAT_TABLE = 'Service Performance Overview';
const EMAIL_TABLE = 'Email - Service Performance Overview';

// Column names with spaces need double-quoting for PostgREST.
// Exclude 'embedding' (vector column) to avoid large payload.
const SELECT_COLUMNS = [
  'id', 'conversation_id', 'created_at', 'updated_at', 'state', 'channel',
  'country', 'assignee_id', 'assignee_name', 'team_id',
  'frt_seconds', 'art_seconds', 'aht_seconds', 'wait_time_seconds',
  'sentiment', 'csat_rating', 'response_count', 'is_reopened', 'reopened_count',
  'contact_id', 'tags', 'synced_at',
  '"CX score"', '"Transcript"',
  '"FRT Hit Rate"', '"ART Hit Rate"', '"Avg Wait Time"',
  'action_performed_by', 'agent_name',
].join(',');

let cexClient: SupabaseClient | null = null;

function getCexClient(): SupabaseClient {
  if (cexClient) return cexClient;
  const url = process.env.CEX_SUPABASE_URL;
  const key = process.env.CEX_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('CEX_SUPABASE_URL and CEX_SUPABASE_ANON_KEY must be set in .env');
  }
  cexClient = createClient(url, key);
  return cexClient;
}

interface SPRow {
  id: number;
  conversation_id: string;
  created_at: string;
  updated_at: string;
  state: string;
  channel: string;
  country: string;
  assignee_id: string;
  assignee_name: string;
  team_id: string;
  frt_seconds: number | null;
  art_seconds: number | null;
  aht_seconds: number | null;
  wait_time_seconds: number | null;
  sentiment: string | null;
  csat_rating: number | null;
  response_count: number;
  is_reopened: boolean;
  reopened_count: number;
  contact_id: string | null;
  tags: unknown;
  synced_at: string;
  'CX score': number | null;
  Transcript: string | null;
  'FRT Hit Rate': number | null;
  'ART Hit Rate': number | null;
  'Avg Wait Time': number | null;
  action_performed_by: string | null;
  agent_name: string | null;
}

function mapRowToConversation(row: SPRow) {
  let subject = row.channel || 'No subject';
  let clientName = 'Unknown';
  try {
    if (row.Transcript) {
      const transcript = JSON.parse(row.Transcript) as Array<{ role?: string; author?: string; body?: string }>;
      const firstUser = transcript.find(m => m?.role === 'USER');
      if (firstUser?.body) {
        subject = firstUser.body.substring(0, 80).replace(/<[^>]*>/g, '').trim() || subject;
      }
      if (firstUser?.author) {
        clientName = firstUser.author;
      }
    }
  } catch { /* ignore */ }

  return {
    id: String(row.conversation_id),
    state: (row.state || '').toLowerCase(),
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_at_iso: row.created_at,
    updated_at_iso: row.updated_at,
    source: {
      subject,
      body: '',
      type: (row.channel || 'conversation').toLowerCase(),
      author: { name: clientName, email: null },
    },
    conversation_rating: row.csat_rating != null ? { rating: row.csat_rating } : undefined,
    custom_attributes: row['CX score'] != null ? { 'CX Score rating': row['CX score'] } : {},
    statistics: { count_conversation_parts: row.response_count || 0 },
    participation_part_count: row.response_count || 0,
    tags: { tags: [] },
    assignee_name: row.assignee_name,
    agent_name: row.agent_name,
    channel: row.channel,
    country: row.country,
    team_id: row.team_id,
    frt_seconds: row.frt_seconds,
    art_seconds: row.art_seconds,
    aht_seconds: row.aht_seconds,
    wait_time_seconds: row.wait_time_seconds,
    sentiment: row.sentiment,
    is_reopened: row.is_reopened,
    reopened_count: row.reopened_count,
    'FRT Hit Rate': row['FRT Hit Rate'],
    'ART Hit Rate': row['ART Hit Rate'],
    'Avg Wait Time': row['Avg Wait Time'],
    action_performed_by: row.action_performed_by,
    Transcript: row.Transcript,
  };
}

/**
 * Query a single table with filters, returning up to 1000 rows.
 */
async function queryTable(
  client: SupabaseClient,
  table: string,
  opts: { assigneeName?: string; updatedSince?: string; updatedBefore?: string },
): Promise<SPRow[]> {
  let query = client.from(table).select(SELECT_COLUMNS);

  if (opts.assigneeName) {
    // Search both assignee_name and agent_name for flexibility
    query = query.or(`assignee_name.ilike.%${opts.assigneeName}%,agent_name.ilike.%${opts.assigneeName}%`);
  }
  if (opts.updatedSince) {
    query = query.gte('created_at', opts.updatedSince);
  }
  if (opts.updatedBefore) {
    query = query.lte('created_at', opts.updatedBefore);
  }

  query = query.order('created_at', { ascending: false }).limit(1000);

  const { data, error } = await query;
  if (error) {
    console.error(`Error querying ${table}:`, error.message);
    throw new Error(`Failed to query ${table}: ${error.message}`);
  }
  return (data || []) as unknown as SPRow[];
}

/**
 * GET /api/service-performance/conversations
 * Returns combined data from Chat + Email service performance tables.
 * Query params:
 *   - assignee_name (optional): filter by assignee name (partial, case-insensitive)
 *   - updated_since (optional): Unix timestamp (seconds)
 *   - updated_before (optional): Unix timestamp (seconds)
 */
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = getCexClient();

    const assigneeName = req.query.assignee_name as string | undefined;
    const updatedSinceTs = req.query.updated_since ? Number(req.query.updated_since) : null;
    const updatedBeforeTs = req.query.updated_before ? Number(req.query.updated_before) : null;

    // Convert Unix timestamps to GMT+6 ISO strings.
    // Frontend sends "April 1 midnight UTC" but user means "April 1 midnight GMT+6".
    // Take the UTC date/time components and label them as +06:00.
    function toGMT6(ts: number): string {
      const d = new Date(ts * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+06:00`;
    }
    const updatedSince = updatedSinceTs ? toGMT6(updatedSinceTs) : undefined;
    const updatedBefore = updatedBeforeTs ? toGMT6(updatedBeforeTs) : undefined;

    const opts = { assigneeName, updatedSince, updatedBefore };

    // Query both tables in parallel
    const [chatRows, emailRows] = await Promise.all([
      queryTable(client, CHAT_TABLE, opts),
      queryTable(client, EMAIL_TABLE, opts),
    ]);

    console.log(`[ServicePerf] Chat: ${chatRows.length} rows, Email: ${emailRows.length} rows`);

    // Combine and map
    const allRows = [...chatRows, ...emailRows];
    const conversations = allRows.map(mapRowToConversation);

    res.json({
      conversations,
      total_count: conversations.length,
      chat_count: chatRows.length,
      email_count: emailRows.length,
      has_more: false,
      participation_count: conversations.reduce((sum, c) => sum + (c.participation_part_count || 0), 0),
      source: 'service-performance-supabase',
    });
  } catch (error: any) {
    console.error('Service performance route error:', error);
    res.status(500).json({ error: error.message || 'Failed to load service performance data' });
  }
});

/**
 * GET /api/service-performance/employees
 * Returns unique assignee names from both tables.
 */
router.get('/employees', async (_req: Request, res: Response): Promise<void> => {
  try {
    const client = getCexClient();

    // Get distinct assignees from both tables
    const [chatRes, emailRes] = await Promise.all([
      client.from(CHAT_TABLE).select('assignee_name').limit(5000),
      client.from(EMAIL_TABLE).select('assignee_name').limit(5000),
    ]);

    const employees = new Map<string, { name: string; count: number }>();
    const allRows = [...(chatRes.data || []), ...(emailRes.data || [])];
    for (const row of allRows) {
      const name = (row as any).assignee_name || 'Unknown';
      const existing = employees.get(name);
      if (existing) {
        existing.count++;
      } else {
        employees.set(name, { name, count: 1 });
      }
    }

    res.json({ employees: Array.from(employees.values()).sort((a, b) => b.count - a.count) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load employees' });
  }
});

export default router;
