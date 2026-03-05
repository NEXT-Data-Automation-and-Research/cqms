-- Platform admin password storage with bcrypt (replacing any legacy SHA-256 if present).
-- SECURITY: Use pgcrypto bcrypt for password hashing (salted, slow).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Single-row table for platform admin credential hash (service role only).
CREATE TABLE IF NOT EXISTS platform_admin_credentials (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_admin_credentials ENABLE ROW LEVEL SECURITY;

-- No RLS policies: only service role can read/write (backend only).
CREATE POLICY "Service role only for platform_admin_credentials"
ON platform_admin_credentials FOR ALL
USING (false)
WITH CHECK (false);

-- Ensure row exists (RPC will set real hash on first call to set_platform_admin_password).
INSERT INTO platform_admin_credentials (id, password_hash, updated_at)
SELECT 1, crypt('REPLACE_VIA_SET_PLATFORM_ADMIN_PASSWORD', gen_salt('bf')), NOW()
ON CONFLICT (id) DO NOTHING;

-- RPC: set platform admin password (bcrypt). Call with service role only.
CREATE OR REPLACE FUNCTION set_platform_admin_password(p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_new_password IS NULL OR length(trim(p_new_password)) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  UPDATE platform_admin_credentials
  SET password_hash = crypt(trim(p_new_password), gen_salt('bf')),
      updated_at = NOW()
  WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO platform_admin_credentials (id, password_hash, updated_at)
    VALUES (1, crypt(trim(p_new_password), gen_salt('bf')), NOW());
  END IF;
END;
$$;

COMMENT ON FUNCTION set_platform_admin_password(TEXT) IS 'Stores platform admin password hashed with bcrypt (pgcrypto). Call with service role only.';
