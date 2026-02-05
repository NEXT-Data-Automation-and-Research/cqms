-- Migration: Extend get_chat_review_raw with employee name, channel, avg score, error count, and view-audit params.
-- Adds helper get_audit_scores_for_raw and drops/recreates get_chat_review_raw with new return columns.

-- Helper: fetch average_score and total_errors_count from a scorecard audit table by id (safe for uuid or text id).
CREATE OR REPLACE FUNCTION public.get_audit_scores_for_raw(p_table_name text, p_audit_id text)
RETURNS TABLE(average_score numeric, total_errors_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_name IS NULL OR trim(p_table_name) = '' OR p_audit_id IS NULL OR trim(p_audit_id) = '' THEN
    RETURN;
  END IF;
  RETURN QUERY EXECUTE format(
    'SELECT a.average_score::numeric, a.total_errors_count::integer FROM %I a WHERE a.id::text = $1 LIMIT 1',
    p_table_name
  ) USING p_audit_id;
EXCEPTION
  WHEN undefined_column OR undefined_table THEN
    RETURN;
END;
$$;

DROP FUNCTION IF EXISTS public.get_chat_review_raw(timestamptz, timestamptz, int);

CREATE OR REPLACE FUNCTION public.get_chat_review_raw(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date   timestamptz DEFAULT NULL,
  p_limit     int DEFAULT 500
)
RETURNS TABLE (
  id                   uuid,
  audit_assignment_id  text,
  assignment_audit_id  text,
  assignment_status    text,
  employee_name        text,
  employee_channel     text,
  average_score        numeric,
  total_errors_count    integer,
  scorecard_id         text,
  scorecard_table_name text,
  conversation_id      text,
  review_status        text,
  reviewer_email       text,
  reviewer_name        text,
  reviewed_at          timestamptz,
  review_click_count   int
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

  SELECT pp.role INTO v_role
  FROM public.people pp
  WHERE pp.email = v_email
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN (
    'Quality Supervisor', 'Manager', 'Admin', 'Super Admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: only Quality Supervisor, Manager, Admin, or Super Admin can view chat review raw data';
  END IF;

  RETURN QUERY
  SELECT
    cr.id,
    cr.audit_assignment_id,
    (aa.audit_id::text) AS assignment_audit_id,
    (aa.status)        AS assignment_status,
    (COALESCE(emp.name, aa.employee_email))::text AS employee_name,
    (emp.channel)      AS employee_channel,
    (s.average_score)::numeric,
    (s.total_errors_count)::integer,
    (sc.id)::text      AS scorecard_id,
    (sc.table_name)::text AS scorecard_table_name,
    cr.conversation_id,
    cr.review_status,
    cr.reviewer_email,
    (COALESCE(p.name, cr.reviewer_email))::text AS reviewer_name,
    cr.reviewed_at,
    (cr.review_click_count)::int
  FROM public.chat_review_records cr
  LEFT JOIN public.audit_assignments aa ON aa.id = cr.audit_assignment_id
  LEFT JOIN public.people p ON p.email = cr.reviewer_email
  LEFT JOIN public.people emp ON emp.email = aa.employee_email
  LEFT JOIN public.scorecards sc ON sc.id = aa.scorecard_id
  LEFT JOIN LATERAL public.get_audit_scores_for_raw(sc.table_name, aa.audit_id::text) s ON true
  WHERE
    (p_from_date IS NULL OR cr.reviewed_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.reviewed_at <= p_to_date)
  ORDER BY cr.reviewed_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 500), 2000));
END;
$$;

COMMENT ON FUNCTION public.get_chat_review_raw(timestamptz, timestamptz, int) IS
  'Returns raw chat review records with employee name, channel, avg score, error count, and scorecard/table for view audit.';

GRANT EXECUTE ON FUNCTION public.get_chat_review_raw(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_scores_for_raw(text, text) TO authenticated;
