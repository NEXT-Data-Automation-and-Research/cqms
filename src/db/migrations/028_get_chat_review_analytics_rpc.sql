-- Migration: get_chat_review_analytics RPC for team leaders
-- Purpose: Allow Quality Supervisor, Manager, Admin, Super Admin to view aggregated
-- chat review metrics per quality analyst (reviewer). Runs with SECURITY DEFINER
-- so it can read all chat_review_records regardless of RLS.

-- ============================================================================
-- RPC: get_chat_review_analytics
-- ============================================================================
-- Parameters:
--   p_from_date: optional start of date range (inclusive, timestamptz)
--   p_to_date:   optional end of date range (inclusive, timestamptz)
-- Returns: one row per reviewer with aggregated metrics.
-- Caller must have role in ('Quality Supervisor', 'Manager', 'Admin', 'Super Admin').

CREATE OR REPLACE FUNCTION public.get_chat_review_analytics(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  reviewer_email             text,
  reviewer_name              text,
  total_conversations_reviewed bigint,
  total_review_clicks         bigint,
  assignments_reviewed       bigint,
  last_reviewed_at            timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := auth.jwt() ->> 'email';
  v_role  text;
BEGIN
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RAISE EXCEPTION 'Unauthorized: no email in JWT';
  END IF;

  SELECT p.role INTO v_role
  FROM public.people p
  WHERE p.email = v_email
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN (
    'Quality Supervisor', 'Manager', 'Admin', 'Super Admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: only Quality Supervisor, Manager, Admin, or Super Admin can view chat review analytics';
  END IF;

  RETURN QUERY
  SELECT
    cr.reviewer_email,
    COALESCE(p.name, cr.reviewer_email) AS reviewer_name,
    count(*)::bigint                    AS total_conversations_reviewed,
    coalesce(sum(cr.review_click_count), 0)::bigint AS total_review_clicks,
    count(DISTINCT cr.audit_assignment_id)::bigint  AS assignments_reviewed,
    max(cr.reviewed_at)                 AS last_reviewed_at
  FROM public.chat_review_records cr
  LEFT JOIN public.people p ON p.email = cr.reviewer_email
  WHERE
    (p_from_date IS NULL OR cr.reviewed_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.reviewed_at <= p_to_date)
  GROUP BY cr.reviewer_email, p.name
  ORDER BY total_conversations_reviewed DESC, last_reviewed_at DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_chat_review_analytics(timestamptz, timestamptz) IS
  'Returns per-reviewer chat review metrics for team leaders. Restricted to Quality Supervisor, Manager, Admin, Super Admin. Optional date filter on reviewed_at.';

GRANT EXECUTE ON FUNCTION public.get_chat_review_analytics(timestamptz, timestamptz) TO authenticated;
