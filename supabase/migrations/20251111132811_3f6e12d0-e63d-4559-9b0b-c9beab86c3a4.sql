-- Fix RLS for badges table (public table that should be readable by all)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view badges (they're public information)
CREATE POLICY "Badges are viewable by everyone" ON badges
  FOR SELECT USING (true);