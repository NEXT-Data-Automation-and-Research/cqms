-- RLS on user_page_views: users see own rows; Admin/Super Admin see all.
-- Inserts are via API (service role), which bypasses RLS.

ALTER TABLE user_page_views ENABLE ROW LEVEL SECURITY;

-- Users can read their own page views
CREATE POLICY "Users can read own page views"
  ON user_page_views FOR SELECT
  USING (user_id = auth.uid());

-- Admin and Super Admin can read all page views (role from people table)
CREATE POLICY "Admin and Super Admin can read all page views"
  ON user_page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.people p
      JOIN auth.users u ON u.email = p.email
      WHERE u.id = auth.uid()
        AND p.role IN ('Admin', 'Super Admin')
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users; API uses service role for inserts.
