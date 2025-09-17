-- =====================================================
-- DISEASE OUTBREAK MONITORING SYSTEM FOR INDIA
-- =====================================================

-- Active Diseases Table (stores all disease information)
CREATE TABLE IF NOT EXISTS active_diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_name VARCHAR(255) NOT NULL UNIQUE,
    disease_type VARCHAR(100), -- viral, bacterial, parasitic, fungal, etc.
    symptoms TEXT[], -- Array of symptoms
    safety_measures TEXT[], -- Array of safety measures
    prevention_methods TEXT[], -- Array of prevention methods
    treatment_info TEXT, -- Treatment information
    incubation_period VARCHAR(100), -- e.g., "2-14 days"
    transmission_mode VARCHAR(255), -- airborne, waterborne, vector-borne, etc.
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    first_reported DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disease Cases by Location (tracks cases across India)
CREATE TABLE IF NOT EXISTS disease_cases_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_id UUID REFERENCES active_diseases(id) ON DELETE CASCADE,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    pincode VARCHAR(10),
    active_cases INTEGER DEFAULT 0,
    recovered_cases INTEGER DEFAULT 0,
    death_cases INTEGER DEFAULT 0,
    total_cases INTEGER GENERATED ALWAYS AS (active_cases + recovered_cases + death_cases) STORED,
    cases_today INTEGER DEFAULT 0, -- New cases reported today
    week_trend VARCHAR(20) CHECK (week_trend IN ('increasing', 'decreasing', 'stable')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source TEXT, -- Where this data came from
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(disease_id, state, district, pincode)
);

-- National Disease Statistics (India-wide data)
CREATE TABLE IF NOT EXISTS disease_national_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease_id UUID REFERENCES active_diseases(id) ON DELETE CASCADE,
    total_active_cases INTEGER DEFAULT 0,
    total_recovered_cases INTEGER DEFAULT 0,
    total_deaths INTEGER DEFAULT 0,
    total_cases INTEGER GENERATED ALWAYS AS (total_active_cases + total_recovered_cases + total_deaths) STORED,
    new_cases_today INTEGER DEFAULT 0,
    states_affected INTEGER DEFAULT 0,
    districts_affected INTEGER DEFAULT 0,
    recovery_rate DECIMAL(5,2), -- Percentage
    mortality_rate DECIMAL(5,2), -- Percentage
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(disease_id)
);

-- User Alert Preferences (users who opted for alerts)
CREATE TABLE IF NOT EXISTS user_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    alert_enabled BOOLEAN DEFAULT true,
    alert_radius INTEGER DEFAULT 50, -- km radius for nearby alerts
    severity_threshold VARCHAR(20) DEFAULT 'medium', -- minimum severity to alert
    alert_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, daily, weekly
    preferred_time VARCHAR(10) DEFAULT '09:00', -- preferred time for non-urgent alerts
    diseases_of_interest TEXT[], -- specific diseases to track, null = all
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert History (track all sent alerts)
CREATE TABLE IF NOT EXISTS disease_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    disease_id UUID REFERENCES active_diseases(id) ON DELETE CASCADE,
    alert_type VARCHAR(50), -- new_outbreak, case_surge, nearby_cases, safety_update
    message_content TEXT NOT NULL,
    location_context JSONB, -- {state, district, pincode, cases_in_area}
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
    whatsapp_message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Data Collection Logs (track AI-based data gathering)
CREATE TABLE IF NOT EXISTS ai_data_collection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50), -- gemini, news_scan, health_bulletin
    query_text TEXT, -- What we searched for
    response_data JSONB, -- Raw response from AI
    extracted_diseases JSONB, -- Processed disease data
    new_outbreaks_found INTEGER DEFAULT 0,
    updates_made INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processed, failed
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indian States and Districts Reference Table
CREATE TABLE IF NOT EXISTS indian_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(100) NOT NULL,
    state_code VARCHAR(10),
    district VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(state, district)
);

-- Disease Outbreak Sources (trusted sources for data)
CREATE TABLE IF NOT EXISTS outbreak_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50), -- website, api, ai_scan, manual
    source_url TEXT,
    reliability_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
    last_checked TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Disease cases location indexes
CREATE INDEX idx_disease_cases_state ON disease_cases_location(state);
CREATE INDEX idx_disease_cases_district ON disease_cases_location(state, district);
CREATE INDEX idx_disease_cases_pincode ON disease_cases_location(pincode);
CREATE INDEX idx_disease_cases_active ON disease_cases_location(active_cases) WHERE active_cases > 0;

-- User preferences indexes
CREATE INDEX idx_user_alerts_location ON user_alert_preferences(state, district);
CREATE INDEX idx_user_alerts_pincode ON user_alert_preferences(pincode);
CREATE INDEX idx_user_alerts_enabled ON user_alert_preferences(alert_enabled) WHERE alert_enabled = true;

-- Alert history indexes
CREATE INDEX idx_alert_history_user ON disease_alert_history(user_id, sent_at DESC);
CREATE INDEX idx_alert_history_disease ON disease_alert_history(disease_id);
CREATE INDEX idx_alert_history_status ON disease_alert_history(delivery_status);

-- National stats indexes
CREATE INDEX idx_national_stats_disease ON disease_national_stats(disease_id);
CREATE INDEX idx_national_stats_updated ON disease_national_stats(last_updated DESC);

-- =====================================================
-- SAMPLE DATA FOR COMMON INDIAN DISEASES
-- =====================================================

-- Insert some common diseases to track
INSERT INTO outbreak_data_sources (source_name, source_type, reliability_score) VALUES
('AI Gemini News Scan', 'ai_scan', 0.75),
('Ministry of Health India', 'website', 0.95),
('NCDC India', 'website', 0.90),
('WHO South-East Asia', 'website', 0.85),
('Indian Express Health', 'news_scan', 0.70),
('Times of India Health', 'news_scan', 0.70)
ON CONFLICT DO NOTHING;

-- Insert major Indian states for reference
INSERT INTO indian_locations (state, state_code, district) VALUES
('Maharashtra', 'MH', 'Mumbai'),
('Maharashtra', 'MH', 'Pune'),
('Delhi', 'DL', 'New Delhi'),
('Karnataka', 'KA', 'Bangalore'),
('Tamil Nadu', 'TN', 'Chennai'),
('West Bengal', 'WB', 'Kolkata'),
('Gujarat', 'GJ', 'Ahmedabad'),
('Rajasthan', 'RJ', 'Jaipur'),
('Uttar Pradesh', 'UP', 'Lucknow'),
('Bihar', 'BR', 'Patna')
ON CONFLICT DO NOTHING;
