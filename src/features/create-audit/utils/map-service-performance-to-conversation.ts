/**
 * Maps a row from "Service Performance overview" (different database) to the
 * conversation payload shape expected by the create-audit pull-conversations UI.
 * Use this in ETL (when syncing into Supabase conversations table) or in an
 * Edge Function that proxies the other database.
 */

export interface ServicePerformanceRow {
  id?: number;
  conversation_id: string;
  assignee_id: string;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
  state?: string;
  channel?: string;
  country?: string;
  Transcript?: string | null;
  csat_rating?: number | null;
  'CX score'?: number | null;
  response_count?: number | null;
  reopened_count?: number | null;
  frt_seconds?: number | null;
  tags?: unknown;
  [key: string]: unknown;
}

export interface ConversationPayload {
  id: string;
  state: string;
  created_at: string;
  updated_at: string;
  source: {
    subject: string;
    body: string;
    type: string;
    author: { name: string; email: string | null };
  };
  conversation_rating?: { rating: number };
  custom_attributes?: Record<string, unknown>;
  statistics?: { time_to_admin_reply?: number; count_reopens?: number };
  participation_part_count?: number;
  admin_assignee_id?: string;
  assignee_name?: string;
  country?: string;
  channel?: string;
  tags?: unknown;
  Transcript?: string;
}

function safeParseJSON<T>(str: string | null | undefined): T | null {
  if (str == null || str === '') return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

/**
 * Map one "Service Performance overview" row to the conversation shape used by
 * the create-audit page (pull conversations list, filters, Review, Audit).
 */
export function mapServicePerformanceRowToConversation(
  row: ServicePerformanceRow
): ConversationPayload {
  const transcript = safeParseJSON<Array<{ role?: string; author?: string; body?: string }>>(
    row.Transcript
  );
  const firstUser = Array.isArray(transcript)
    ? transcript.find((m) => m?.role === 'USER')
    : null;
  const subject = (firstUser?.body ?? '').substring(0, 80) || row.channel || 'No subject';
  const clientName = firstUser?.author ?? 'Unknown';

  const payload: ConversationPayload = {
    id: String(row.conversation_id),
    state: (row.state ?? '').toLowerCase() || 'unknown',
    created_at: row.created_at,
    updated_at: row.updated_at,
    source: {
      subject,
      body: firstUser?.body ?? '',
      type: (row.channel ?? 'conversation').toLowerCase(),
      author: {
        name: clientName,
        email: null,
      },
    },
    participation_part_count: row.response_count ?? 0,
    admin_assignee_id: row.assignee_id,
    assignee_name: row.assignee_name,
    country: row.country,
    channel: row.channel,
    tags: row.tags,
    Transcript: row.Transcript ?? undefined,
  };

  if (row.csat_rating != null) {
    payload.conversation_rating = { rating: row.csat_rating };
  }

  if (row['CX score'] != null) {
    payload.custom_attributes = { 'CX Score rating': row['CX score'] };
  }

  if (row.frt_seconds != null || row.reopened_count != null) {
    payload.statistics = {
      time_to_admin_reply: row.frt_seconds != null ? row.frt_seconds * 60 : undefined,
      count_reopens: row.reopened_count ?? 0,
    };
  }

  return payload;
}

/**
 * Build a row for Supabase public.conversations from a Service Performance row.
 * Use in ETL: insert into conversations (id, admin_id, updated_at, payload).
 */
export function servicePerformanceRowToConversationsTable(row: ServicePerformanceRow): {
  id: string;
  admin_id: string;
  updated_at: string;
  payload: ConversationPayload;
} {
  const payload = mapServicePerformanceRowToConversation(row);
  return {
    id: payload.id,
    admin_id: String(row.assignee_id),
    updated_at: row.updated_at,
    payload,
  };
}
