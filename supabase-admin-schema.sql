-- Admin Configuration Tables

-- 1. Admin Users Table (for authentication)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Secrets Vault (encrypted API keys)
CREATE TABLE IF NOT EXISTS secrets_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  key_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Services Configuration
CREATE TABLE IF NOT EXISTS services_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Screening Questions Configuration
CREATE TABLE IF NOT EXISTS screening_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_type TEXT CHECK (question_type IN ('screening_one', 'screening_two')) NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT CHECK (field_type IN ('text', 'email', 'tel', 'textarea', 'select', 'number')) NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- For select fields
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Time Slots Configuration
CREATE TABLE IF NOT EXISTS time_slots_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  time_slot TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. General Settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT CHECK (setting_type IN ('text', 'number', 'boolean', 'json')) DEFAULT 'text',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_secrets_vault_active ON secrets_vault(is_active);
CREATE INDEX IF NOT EXISTS idx_services_config_active ON services_config(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_screening_questions_type ON screening_questions(question_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_time_slots_active ON time_slots_config(is_active, sort_order);

-- Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll add proper auth later)
-- In production, you'd restrict these to authenticated admin users only
CREATE POLICY "Allow all on admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on secrets_vault" ON secrets_vault FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on services_config" ON services_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on screening_questions" ON screening_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on time_slots_config" ON time_slots_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default services
INSERT INTO services_config (service_name, service_value, description, sort_order) VALUES
  ('Consulting Services', 'consulting', 'Strategic consulting and advisory services', 1),
  ('Design & Creative', 'design', 'UI/UX design and creative services', 2),
  ('Development & Engineering', 'development', 'Software development and engineering', 3),
  ('Marketing & Strategy', 'marketing', 'Marketing and growth strategy', 4),
  ('Other', 'other', 'Other services', 5)
ON CONFLICT DO NOTHING;

-- Insert default time slots
INSERT INTO time_slots_config (time_slot, sort_order) VALUES
  ('9:00 AM', 1),
  ('10:00 AM', 2),
  ('11:00 AM', 3),
  ('1:00 PM', 4),
  ('2:00 PM', 5),
  ('3:00 PM', 6),
  ('4:00 PM', 7)
ON CONFLICT DO NOTHING;

-- Insert default screening questions for Screening One
INSERT INTO screening_questions (question_type, field_name, field_label, field_type, placeholder, is_required, sort_order) VALUES
  ('screening_one', 'name', 'Name', 'text', 'Your full name', true, 1),
  ('screening_one', 'email', 'Email', 'email', 'your@email.com', true, 2),
  ('screening_one', 'phone', 'Phone Number', 'tel', '(555) 123-4567', false, 3),
  ('screening_one', 'service_interest', 'Service Interest', 'select', null, true, 4),
  ('screening_one', 'budget_range', 'Budget Range', 'select', null, false, 5),
  ('screening_one', 'timeline', 'Timeline', 'select', null, false, 6),
  ('screening_one', 'description', 'Project Description', 'textarea', 'Tell us about your project and what you''re hoping to achieve...', true, 7)
ON CONFLICT DO NOTHING;

-- Insert select options for service_interest
UPDATE screening_questions
SET options = '[
  {"label": "Select a service...", "value": ""},
  {"label": "Consulting Services", "value": "consulting"},
  {"label": "Design & Creative", "value": "design"},
  {"label": "Development & Engineering", "value": "development"},
  {"label": "Marketing & Strategy", "value": "marketing"},
  {"label": "Other", "value": "other"}
]'::jsonb
WHERE field_name = 'service_interest';

-- Insert select options for budget_range
UPDATE screening_questions
SET options = '[
  {"label": "Select budget...", "value": ""},
  {"label": "Less than $5,000", "value": "<5k"},
  {"label": "$5,000 - $15,000", "value": "5k-15k"},
  {"label": "$15,000 - $50,000", "value": "15k-50k"},
  {"label": "$50,000+", "value": "50k+"}
]'::jsonb
WHERE field_name = 'budget_range';

-- Insert select options for timeline
UPDATE screening_questions
SET options = '[
  {"label": "Select timeline...", "value": ""},
  {"label": "Urgent (Within 2 weeks)", "value": "urgent"},
  {"label": "1-2 months", "value": "1-2months"},
  {"label": "3-6 months", "value": "3-6months"},
  {"label": "Flexible", "value": "flexible"}
]'::jsonb
WHERE field_name = 'timeline';

-- Insert default screening questions for Screening Two
INSERT INTO screening_questions (question_type, field_name, field_label, field_type, placeholder, is_required, sort_order) VALUES
  ('screening_two', 'goals', 'What are your primary goals?', 'textarea', 'Describe what you want to achieve...', true, 1),
  ('screening_two', 'challenges', 'What challenges are you facing?', 'textarea', 'What obstacles or pain points are you experiencing?', true, 2),
  ('screening_two', 'previous_experience', 'Previous Experience', 'textarea', 'Have you worked with similar services before? What was your experience?', false, 3),
  ('screening_two', 'additional_notes', 'Additional Notes', 'textarea', 'Anything else you''d like us to know?', false, 4)
ON CONFLICT DO NOTHING;

-- Insert default app settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
  ('app_name', 'Client Consultation Booking', 'text', 'Application name displayed to users'),
  ('app_description', 'Complete our AI-powered screening process to ensure we''re the right fit for your needs, then schedule your personalized consultation.', 'text', 'Application description'),
  ('ai_enabled', 'false', 'boolean', 'Enable AI analysis features'),
  ('email_notifications_enabled', 'false', 'boolean', 'Enable email notifications'),
  ('google_calendar_enabled', 'false', 'boolean', 'Enable Google Calendar integration')
ON CONFLICT DO NOTHING;
