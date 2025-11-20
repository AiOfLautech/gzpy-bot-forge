-- Fix RLS policy for mini_game_sessions table
DROP POLICY IF EXISTS "Public can manage game sessions" ON mini_game_sessions;

-- Create authenticated user-only policies for mini_game_sessions
CREATE POLICY "Users can manage own sessions"
  ON mini_game_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Bot owners can view sessions"
  ON mini_game_sessions FOR SELECT
  TO authenticated
  USING (bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid()));