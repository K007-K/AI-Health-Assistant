# 🚨 URGENT FIX: Supabase RLS Policy Error

## Problem
Your bot is receiving WhatsApp messages but failing with this error:
```
Error creating user: new row violates row-level security policy for table "users"
```

## Immediate Solution

### Method 1: Disable RLS (Quickest Fix)
1. Go to your **Supabase Dashboard**: https://vfcalzbjezbtgwwvytns.supabase.co
2. Navigate to **SQL Editor**
3. Run this command:

```sql
-- Disable Row Level Security for all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

### Method 2: Fix RLS Policies (Recommended)
Instead of disabling RLS, create proper policies:

```sql
-- Create permissive policies for service role
CREATE POLICY "Allow service role access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON appointments FOR ALL USING (true) WITH CHECK (true);
```

## Test After Fix

1. **Send "Hi" to your WhatsApp number again**
2. **Check Render logs** - should see successful user creation
3. **Bot should respond** with language selection menu

## Expected Working Log
After the fix, you should see:
```
📱 Incoming message from 918977733389: {"text":{"body":"Hello"}}
👤 New user created: 918977733389
✅ User preferences updated
💬 Bot Response: Language selection menu sent
```

## Files Updated
- `database/fix-rls.sql` - Quick fix SQL commands
- `src/config/database.js` - Added admin client for write operations  
- `src/services/userService.js` - Use admin client for user creation
- `src/services/conversationService.js` - Use admin client for message saving

## Why This Happened
Supabase Row Level Security (RLS) was blocking inserts because:
1. RLS was enabled on tables
2. No policies were created to allow the service role to insert data
3. The bot uses service role key for database operations

## Prevention
The updated code now:
- Uses `supabaseAdmin` client with service role key for write operations
- Uses regular `supabase` client for read operations
- Includes proper RLS policies in the schema

**Choose Method 1 for immediate fix, Method 2 for production security!**