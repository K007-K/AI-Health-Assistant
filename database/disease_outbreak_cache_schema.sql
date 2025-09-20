-- Enhanced Disease Outbreak Caching System
-- Eliminates redundant API queries by caching responses per state/nationwide

-- 1. Cached Disease Outbreak Responses
CREATE TABLE IF NOT EXISTS disease_outbreak_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Cache identification
  cache_type VARCHAR(20) NOT NULL CHECK (cache_type IN ('nationwide', 'state')),
  state_name VARCHAR(100), -- NULL for nationwide, specific state for state-based
  
  -- Cached AI response
  ai_response_text TEXT NOT NULL,
  parsed_diseases JSONB NOT NULL, -- Structured disease data
  
  -- Cache metadata
  query_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one cache per type per day
  UNIQUE(cache_type, state_name, query_date)
);

-- 2. Indian States Master Data (for searchable selection)
CREATE TABLE IF NOT EXISTS indian_states (
  id SERIAL PRIMARY KEY,
  state_name VARCHAR(100) NOT NULL UNIQUE,
  state_code VARCHAR(10) NOT NULL UNIQUE,
  region VARCHAR(50), -- North, South, East, West, Central, Northeast
  capital VARCHAR(100),
  is_union_territory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert all Indian states and UTs
INSERT INTO indian_states (state_name, state_code, region, capital, is_union_territory) VALUES
-- States
('Andhra Pradesh', 'AP', 'South', 'Amaravati', FALSE),
('Arunachal Pradesh', 'AR', 'Northeast', 'Itanagar', FALSE),
('Assam', 'AS', 'Northeast', 'Dispur', FALSE),
('Bihar', 'BR', 'East', 'Patna', FALSE),
('Chhattisgarh', 'CG', 'Central', 'Raipur', FALSE),
('Goa', 'GA', 'West', 'Panaji', FALSE),
('Gujarat', 'GJ', 'West', 'Gandhinagar', FALSE),
('Haryana', 'HR', 'North', 'Chandigarh', FALSE),
('Himachal Pradesh', 'HP', 'North', 'Shimla', FALSE),
('Jharkhand', 'JH', 'East', 'Ranchi', FALSE),
('Karnataka', 'KA', 'South', 'Bengaluru', FALSE),
('Kerala', 'KL', 'South', 'Thiruvananthapuram', FALSE),
('Madhya Pradesh', 'MP', 'Central', 'Bhopal', FALSE),
('Maharashtra', 'MH', 'West', 'Mumbai', FALSE),
('Manipur', 'MN', 'Northeast', 'Imphal', FALSE),
('Meghalaya', 'ML', 'Northeast', 'Shillong', FALSE),
('Mizoram', 'MZ', 'Northeast', 'Aizawl', FALSE),
('Nagaland', 'NL', 'Northeast', 'Kohima', FALSE),
('Odisha', 'OR', 'East', 'Bhubaneswar', FALSE),
('Punjab', 'PB', 'North', 'Chandigarh', FALSE),
('Rajasthan', 'RJ', 'North', 'Jaipur', FALSE),
('Sikkim', 'SK', 'Northeast', 'Gangtok', FALSE),
('Tamil Nadu', 'TN', 'South', 'Chennai', FALSE),
('Telangana', 'TS', 'South', 'Hyderabad', FALSE),
('Tripura', 'TR', 'Northeast', 'Agartala', FALSE),
('Uttar Pradesh', 'UP', 'North', 'Lucknow', FALSE),
('Uttarakhand', 'UK', 'North', 'Dehradun', FALSE),
('West Bengal', 'WB', 'East', 'Kolkata', FALSE),

-- Union Territories
('Andaman and Nicobar Islands', 'AN', 'South', 'Port Blair', TRUE),
('Chandigarh', 'CH', 'North', 'Chandigarh', TRUE),
('Dadra and Nagar Haveli and Daman and Diu', 'DH', 'West', 'Daman', TRUE),
('Delhi', 'DL', 'North', 'New Delhi', TRUE),
('Jammu and Kashmir', 'JK', 'North', 'Srinagar', TRUE),
('Ladakh', 'LA', 'North', 'Leh', TRUE),
('Lakshadweep', 'LD', 'South', 'Kavaratti', TRUE),
('Puducherry', 'PY', 'South', 'Puducherry', TRUE)

ON CONFLICT (state_name) DO NOTHING;

-- 3. Enhanced User Alert Preferences (with state selection)
ALTER TABLE user_alert_preferences 
ADD COLUMN IF NOT EXISTS selected_state_id INTEGER REFERENCES indian_states(id),
ADD COLUMN IF NOT EXISTS last_alert_sent TIMESTAMP,
ADD COLUMN IF NOT EXISTS alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (alert_frequency IN ('immediate', 'daily', 'weekly'));

-- 4. Cache Performance Indexes
CREATE INDEX IF NOT EXISTS idx_outbreak_cache_type_state_date ON disease_outbreak_cache (cache_type, state_name, query_date);
CREATE INDEX IF NOT EXISTS idx_outbreak_cache_updated ON disease_outbreak_cache (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_states_name_search ON indian_states USING gin(to_tsvector('english', state_name));
CREATE INDEX IF NOT EXISTS idx_user_alerts_state ON user_alert_preferences (selected_state_id, alert_enabled);

-- 5. Cache Cleanup Function (remove old cache entries)
CREATE OR REPLACE FUNCTION cleanup_old_disease_cache()
RETURNS void AS $$
BEGIN
  -- Keep only last 7 days of cache
  DELETE FROM disease_outbreak_cache 
  WHERE query_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 6. Daily Cache Cleanup Job (to be scheduled)
-- This would be called by a cron job or background task
-- SELECT cleanup_old_disease_cache();
