-- WhatsApp Healthcare Bot Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for storing user preferences and profile
CREATE TABLE users (
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
    consent_outbreak_alerts BOOLEAN DEFAULT FALSE,
    consent_data_collection BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table for storing chat history and context
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot')),
    content TEXT NOT NULL,
    message_id TEXT, -- WhatsApp message ID
    reply_to_message_id TEXT, -- For thread tracking
    language TEXT DEFAULT 'en',
    intent TEXT, -- detected intent like 'symptom_check', 'preventive_tips', etc.
    metadata JSONB DEFAULT '{}', -- additional context, media info, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback table for accuracy tracking
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating IN (1, 5)), -- 1 = thumbs down, 5 = thumbs up
    comment TEXT,
    feature_used TEXT, -- which feature was being used when feedback given
    accuracy_category TEXT, -- 'helpful', 'not_helpful', 'partially_helpful'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for tracking conversation state
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_state TEXT DEFAULT 'main_menu', -- current conversation state
    context_data JSONB DEFAULT '{}', -- temporary data for multi-step flows
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health tips and content (for caching and customization)
CREATE TABLE health_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL, -- 'preventive', 'nutrition', 'exercise', 'symptoms'
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
    age_group TEXT[], -- ['child', 'adult', 'elderly']
    gender_specific TEXT[], -- ['male', 'female', 'all']
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Future: Appointments table (for government database integration)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    appointment_type TEXT, -- 'vaccination', 'checkup', 'consultation'
    scheduled_date DATE,
    scheduled_time TIME,
    location TEXT,
    healthcare_provider TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')),
    reminder_sent BOOLEAN DEFAULT FALSE,
    government_db_id TEXT, -- for future integration
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Future: Outbreak alerts table
CREATE TABLE outbreak_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disease_name TEXT NOT NULL,
    severity_level TEXT CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    affected_regions TEXT[],
    alert_message_en TEXT,
    alert_message_hi TEXT,
    alert_message_te TEXT,
    alert_message_ta TEXT,
    alert_message_or TEXT,
    source_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_health_content_category ON health_content(category);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);

-- RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

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