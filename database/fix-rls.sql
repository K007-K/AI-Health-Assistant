-- Fix for Supabase RLS Policy Error
-- Run this in your Supabase SQL Editor to fix the "row-level security policy" error

-- Disable RLS temporarily to allow unrestricted access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY; 
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Alternative: Keep RLS enabled but create permissive policies
-- Uncomment the lines below if you prefer to keep RLS enabled:

/*
-- Re-enable RLS with proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service role access
CREATE POLICY "Allow service role access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON appointments FOR ALL USING (true) WITH CHECK (true);
*/

-- Grant necessary permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;