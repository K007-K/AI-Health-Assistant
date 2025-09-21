-- Optimized WhatsApp Healthcare Bot Database Schema
-- Streamlined schema with 43.75% fewer tables while maintaining core functionality
-- See SCHEMA_OPTIMIZATION.md for detailed changes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core user management
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'te', 'ta', 'or')),
  script_preference TEXT DEFAULT 'native' CHECK (script_preference IN ('native', 'transliteration')),
  accessibility_mode TEXT DEFAULT 'normal' CHECK (accessibility_mode IN ('normal', 'easy', 'long', 'audio')),
  emergency_contact TEXT,
  location_pincode TEXT,
  first_name TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  consent_data_collection BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User session management for conversation state
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_state TEXT DEFAULT 'main_menu',
  context_data JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation history for context-aware responses
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot')),
  content TEXT NOT NULL,
  message_id TEXT,
  language TEXT DEFAULT 'en',
  intent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feedback for bot improvement
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (1, 5)),
  comment TEXT,
  feature_used TEXT,
  accuracy_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health content for multilingual tips and information
CREATE TABLE IF NOT EXISTS health_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  subcategory TEXT,
  title_en TEXT,
  title_hi TEXT,
  title_te TEXT,
  title_ta TEXT,
  title_or TEXT,
  content_en TEXT,
  content_hi TEXT,
  content_te TEXT,
  content_ta TEXT,
  content_or TEXT,
  tags TEXT[],
  age_group TEXT[],
  gender_specific TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disease outbreak monitoring (simplified)
CREATE TABLE IF NOT EXISTS active_diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_name VARCHAR NOT NULL UNIQUE,
  disease_type VARCHAR,
  symptoms TEXT[],
  safety_measures TEXT[],
  prevention_methods TEXT[],
  treatment_info TEXT,
  transmission_mode VARCHAR,
  risk_level VARCHAR CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  first_reported DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indian states for location-based services
CREATE SEQUENCE IF NOT EXISTS indian_states_id_seq;
CREATE TABLE IF NOT EXISTS indian_states (
  id INTEGER PRIMARY KEY DEFAULT nextval('indian_states_id_seq'),
  state_name VARCHAR NOT NULL UNIQUE,
  state_code VARCHAR NOT NULL UNIQUE,
  region VARCHAR,
  capital VARCHAR,
  is_union_territory BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User alert preferences for disease notifications
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  state VARCHAR NOT NULL,
  district VARCHAR NOT NULL,
  pincode VARCHAR NOT NULL,
  alert_enabled BOOLEAN DEFAULT true,
  severity_threshold VARCHAR DEFAULT 'medium',
  preferred_time VARCHAR DEFAULT '09:00',
  diseases_of_interest TEXT[],
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  selected_state_id INTEGER REFERENCES indian_states(id)
);

-- Disease outbreak cache for performance
CREATE TABLE IF NOT EXISTS disease_outbreak_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_type VARCHAR NOT NULL CHECK (cache_type IN ('nationwide', 'state')),
  state_name VARCHAR,
  ai_response_text TEXT NOT NULL,
  parsed_diseases JSONB NOT NULL,
  query_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow service role access
CREATE POLICY "Enable insert for service role" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for service role" ON users
    FOR SELECT USING (true);

CREATE POLICY "Enable update for service role" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for service role" ON users
    FOR DELETE USING (true);

CREATE POLICY "Enable all for conversations" ON conversations
    FOR ALL WITH CHECK (true);

CREATE POLICY "Enable all for feedback" ON feedback
    FOR ALL WITH CHECK (true);

CREATE POLICY "Enable all for user_sessions" ON user_sessions
    FOR ALL WITH CHECK (true);

CREATE POLICY "Enable all for appointments" ON appointments
    FOR ALL WITH CHECK (true);

-- Enable real-time subscriptions for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_content_updated_at BEFORE UPDATE ON health_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample health content data
INSERT INTO health_content (category, subcategory, title_en, content_en, tags) VALUES
('preventive', 'hygiene', 'Hand Washing', 'Wash your hands regularly with soap and water for at least 20 seconds. This prevents the spread of infections and diseases.', ARRAY['hygiene', 'prevention', 'basic']),
('preventive', 'nutrition', 'Balanced Diet', 'Eat a variety of fruits, vegetables, whole grains, and lean proteins. Limit processed foods and sugar intake.', ARRAY['nutrition', 'diet', 'health']),
('symptoms', 'fever', 'Fever Management', 'For fever: Rest, drink plenty of fluids, take paracetamol if needed. Consult a doctor if fever exceeds 102°F or persists more than 3 days.', ARRAY['fever', 'symptoms', 'treatment']);

-- Sample user for testing (optional)
-- INSERT INTO users (phone_number, preferred_language, first_name) VALUES ('+1234567890', 'en', 'Test User');