-- Optimized WhatsApp Healthcare Bot Database Schema
-- Removed unnecessary tables and kept only essential functionality

-- Core user management
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone_number text NOT NULL UNIQUE,
  preferred_language text DEFAULT 'en'::text CHECK (preferred_language = ANY (ARRAY['en'::text, 'hi'::text, 'te'::text, 'ta'::text, 'or'::text])),
  script_preference text DEFAULT 'native'::text CHECK (script_preference = ANY (ARRAY['native'::text, 'transliteration'::text])),
  accessibility_mode text DEFAULT 'normal'::text CHECK (accessibility_mode = ANY (ARRAY['normal'::text, 'easy'::text, 'long'::text, 'audio'::text])),
  emergency_contact text,
  location_pincode text,
  first_name text,
  age integer,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])),
  consent_data_collection boolean DEFAULT true,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- User session management for conversation state
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  session_state text DEFAULT 'main_menu'::text,
  context_data jsonb DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Conversation history for context-aware responses
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  message_type text NOT NULL CHECK (message_type = ANY (ARRAY['user'::text, 'bot'::text])),
  content text NOT NULL,
  message_id text,
  language text DEFAULT 'en'::text,
  intent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- User feedback for bot improvement
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  conversation_id uuid,
  rating integer CHECK (rating = ANY (ARRAY[1, 5])),
  comment text,
  feature_used text,
  accuracy_category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT feedback_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
);

-- Health content for multilingual tips and information
CREATE TABLE public.health_content (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category text NOT NULL,
  subcategory text,
  title_en text,
  title_hi text,
  title_te text,
  title_ta text,
  title_or text,
  content_en text,
  content_hi text,
  content_te text,
  content_ta text,
  content_or text,
  tags text[],
  age_group text[],
  gender_specific text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_content_pkey PRIMARY KEY (id)
);

-- Disease outbreak monitoring (simplified)
CREATE TABLE public.active_diseases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  disease_name character varying NOT NULL UNIQUE,
  disease_type character varying,
  symptoms text[],
  safety_measures text[],
  prevention_methods text[],
  treatment_info text,
  transmission_mode character varying,
  risk_level character varying CHECK (risk_level::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying]::text[])),
  is_active boolean DEFAULT true,
  first_reported date,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT active_diseases_pkey PRIMARY KEY (id)
);

-- Indian states for location-based services
CREATE SEQUENCE IF NOT EXISTS indian_states_id_seq;
CREATE TABLE public.indian_states (
  id integer NOT NULL DEFAULT nextval('indian_states_id_seq'::regclass),
  state_name character varying NOT NULL UNIQUE,
  state_code character varying NOT NULL UNIQUE,
  region character varying,
  capital character varying,
  is_union_territory boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT indian_states_pkey PRIMARY KEY (id)
);

-- User alert preferences for disease notifications
CREATE TABLE public.user_alert_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number character varying NOT NULL UNIQUE,
  user_id uuid,
  state character varying NOT NULL,
  district character varying NOT NULL,
  pincode character varying NOT NULL,
  alert_enabled boolean DEFAULT true,
  severity_threshold character varying DEFAULT 'medium'::character varying,
  preferred_time character varying DEFAULT '09:00'::character varying,
  diseases_of_interest text[],
  last_alert_sent timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  selected_state_id integer,
  CONSTRAINT user_alert_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_alert_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_alert_preferences_selected_state_id_fkey FOREIGN KEY (selected_state_id) REFERENCES public.indian_states(id)
);

-- Disease outbreak cache for performance
CREATE TABLE public.disease_outbreak_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cache_type character varying NOT NULL CHECK (cache_type::text = ANY (ARRAY['nationwide'::character varying, 'state'::character varying]::text[])),
  state_name character varying,
  ai_response_text text NOT NULL,
  parsed_diseases jsonb NOT NULL,
  query_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT disease_outbreak_cache_pkey PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_phone_number ON public.users(phone_number);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at);
CREATE INDEX idx_health_content_category ON public.health_content(category);
CREATE INDEX idx_active_diseases_name ON public.active_diseases(disease_name);
CREATE INDEX idx_user_alert_preferences_phone ON public.user_alert_preferences(phone_number);
CREATE INDEX idx_disease_outbreak_cache_date ON public.disease_outbreak_cache(query_date);

-- Insert essential Indian states data
INSERT INTO public.indian_states (state_name, state_code, region, capital, is_union_territory) VALUES
('Andhra Pradesh', 'AP', 'South', 'Amaravati', false),
('Arunachal Pradesh', 'AR', 'Northeast', 'Itanagar', false),
('Assam', 'AS', 'Northeast', 'Dispur', false),
('Bihar', 'BR', 'East', 'Patna', false),
('Chhattisgarh', 'CG', 'Central', 'Raipur', false),
('Goa', 'GA', 'West', 'Panaji', false),
('Gujarat', 'GJ', 'West', 'Gandhinagar', false),
('Haryana', 'HR', 'North', 'Chandigarh', false),
('Himachal Pradesh', 'HP', 'North', 'Shimla', false),
('Jharkhand', 'JH', 'East', 'Ranchi', false),
('Karnataka', 'KA', 'South', 'Bengaluru', false),
('Kerala', 'KL', 'South', 'Thiruvananthapuram', false),
('Madhya Pradesh', 'MP', 'Central', 'Bhopal', false),
('Maharashtra', 'MH', 'West', 'Mumbai', false),
('Manipur', 'MN', 'Northeast', 'Imphal', false),
('Meghalaya', 'ML', 'Northeast', 'Shillong', false),
('Mizoram', 'MZ', 'Northeast', 'Aizawl', false),
('Nagaland', 'NL', 'Northeast', 'Kohima', false),
('Odisha', 'OR', 'East', 'Bhubaneswar', false),
('Punjab', 'PB', 'North', 'Chandigarh', false),
('Rajasthan', 'RJ', 'North', 'Jaipur', false),
('Sikkim', 'SK', 'Northeast', 'Gangtok', false),
('Tamil Nadu', 'TN', 'South', 'Chennai', false),
('Telangana', 'TG', 'South', 'Hyderabad', false),
('Tripura', 'TR', 'Northeast', 'Agartala', false),
('Uttar Pradesh', 'UP', 'North', 'Lucknow', false),
('Uttarakhand', 'UK', 'North', 'Dehradun', false),
('West Bengal', 'WB', 'East', 'Kolkata', false),
('Delhi', 'DL', 'North', 'New Delhi', true),
('Puducherry', 'PY', 'South', 'Puducherry', true),
('Chandigarh', 'CH', 'North', 'Chandigarh', true),
('Dadra and Nagar Haveli and Daman and Diu', 'DN', 'West', 'Daman', true),
('Lakshadweep', 'LD', 'South', 'Kavaratti', true),
('Jammu and Kashmir', 'JK', 'North', 'Srinagar', true),
('Ladakh', 'LA', 'North', 'Leh', true),
('Andaman and Nicobar Islands', 'AN', 'South', 'Port Blair', true)
ON CONFLICT (state_name) DO NOTHING;

-- Insert sample health content
INSERT INTO public.health_content (category, subcategory, title_en, content_en, tags, is_active) VALUES
('nutrition', 'balanced_diet', 'Balanced Diet Basics', 'A balanced diet includes grains, proteins, vegetables, fruits, and healthy fats in proper proportions.', ARRAY['nutrition', 'diet', 'health'], true),
('hygiene', 'handwashing', 'Proper Handwashing', 'Wash hands with soap for 20 seconds before eating, after using toilet, and after handling raw food.', ARRAY['hygiene', 'handwashing', 'prevention'], true),
('exercise', 'daily_activity', 'Daily Exercise', 'Aim for at least 30 minutes of moderate physical activity daily, such as walking, yoga, or household work.', ARRAY['exercise', 'fitness', 'health'], true)
ON CONFLICT DO NOTHING;
