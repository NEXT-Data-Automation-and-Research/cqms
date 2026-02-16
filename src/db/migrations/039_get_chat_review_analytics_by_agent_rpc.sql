-- Migration: get_chat_review_analytics_by_agent RPC for Performance Analytics
-- Purpose: Return chat review counts per agent (employee whose audits were reviewed).
-- Auditors open conversations from the create page / pool; each review is tied to an
-- audit_assignment which has employee_email (the agent). This RPC aggregates by agent.
-- Same role restriction as get_chat_review_analytics.

CREATE OR REPLACE FUNCTION public.get_chat_review_analytics_by_agent(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  employee_email              text,
  total_conversations_reviewed bigint
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
    RAISE EXCEPTION 'Forbidden: only Quality Supervisor, Manager, Admin, or Super Admin can view chat review analytics by agent';
  END IF;

  RETURN QUERY
  SELECT
    lower(trim(aa.employee_email))::text AS employee_email,
    count(*)::bigint                     AS total_conversations_reviewed
  FROM public.chat_review_records cr
  INNER JOIN public.audit_assignments aa ON aa.id = cr.audit_assignment_id
  WHERE
    aa.employee_email IS NOT NULL
    AND trim(aa.employee_email) <> ''
    AND (p_from_date IS NULL OR cr.reviewed_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.reviewed_at <= p_to_date)
  GROUP BY lower(trim(aa.employee_email))
  ORDER BY total_conversations_reviewed DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_chat_review_analytics_by_agent(timestamptz, timestamptz) IS
  'Returns per-agent (employee) chat review counts for Performance Analytics. Each row is the number of conversations reviewed in the context of that agent''s assigned audits. Restricted to Quality Supervisor, Manager, Admin, Super Admin.';

GRANT EXECUTE ON FUNCTION public.get_chat_review_analytics_by_agent(timestamptz, timestamptz) TO authenticated;
