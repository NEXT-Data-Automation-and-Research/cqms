-- Migration: get_chat_review_raw RPC for team leaders (raw record list)
-- Purpose: Return individual chat_review_records rows for the same roles as
-- get_chat_review_analytics. SECURITY DEFINER to bypass RLS.

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
    aa.audit_id         AS assignment_audit_id,
    aa.status          AS assignment_status,
    cr.conversation_id,
    cr.review_status,
    cr.reviewer_email,
    COALESCE(p.name, cr.reviewer_email) AS reviewer_name,
    cr.reviewed_at,
    cr.review_click_count
  FROM public.chat_review_records cr
  LEFT JOIN public.audit_assignments aa ON aa.id = cr.audit_assignment_id
  LEFT JOIN public.people p ON p.email = cr.reviewer_email
  WHERE
    (p_from_date IS NULL OR cr.reviewed_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.reviewed_at <= p_to_date)
  ORDER BY cr.reviewed_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 500), 2000));
END;
$$;

COMMENT ON FUNCTION public.get_chat_review_raw(timestamptz, timestamptz, int) IS
  'Returns raw chat review records for team leaders. Same role restriction as get_chat_review_analytics. Max 2000 rows.';

GRANT EXECUTE ON FUNCTION public.get_chat_review_raw(timestamptz, timestamptz, int) TO authenticated;
