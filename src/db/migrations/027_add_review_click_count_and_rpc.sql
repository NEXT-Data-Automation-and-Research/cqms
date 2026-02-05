-- Migration: Add review click count and RPC to record each Review button press
-- Purpose: Track how many times the Review button was pressed per (assignment, conversation)
-- and keep updated_at as the last time it was pressed.

-- ============================================================================
-- ADD COLUMN: review_click_count
-- ============================================================================

ALTER TABLE public.chat_review_records
ADD COLUMN IF NOT EXISTS review_click_count integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.chat_review_records.review_click_count IS 'Number of times the Review button was pressed for this (assignment, conversation).';

-- Backfill existing rows (in case column was added with default)
UPDATE public.chat_review_records
SET review_click_count = 1
WHERE review_click_count IS NULL;

-- ============================================================================
-- RPC: record_chat_review (insert or increment count + update timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_chat_review(
  p_audit_assignment_id text,
  p_conversation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_email text := auth.jwt() ->> 'email';
BEGIN
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RAISE EXCEPTION 'Unauthorized: no email in JWT';
  END IF;

  INSERT INTO public.chat_review_records (
    audit_assignment_id,
    conversation_id,
    review_status,
    reviewer_email,
    review_click_count,
    reviewed_at,
    updated_at
  )
  VALUES (
    p_audit_assignment_id,
    p_conversation_id,
    'reviewed',
    v_email,
    1,
    now(),
    now()
  )
  ON CONFLICT (audit_assignment_id, conversation_id) DO UPDATE SET
    review_click_count = public.chat_review_records.review_click_count + 1,
    reviewed_at = now(),
    updated_at = now(),
    reviewer_email = EXCLUDED.reviewer_email;
END;
$$;

COMMENT ON FUNCTION public.record_chat_review(text, text) IS
  'Records a Review button click: inserts new row or increments review_click_count and updates reviewed_at/updated_at. Uses JWT email as reviewer_email.';

GRANT EXECUTE ON FUNCTION public.record_chat_review(text, text) TO authenticated;
