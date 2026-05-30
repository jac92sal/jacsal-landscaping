-- Branding Configuration Tables for White-Label SaaS

-- 1. Branding Settings
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for prototype - restrict in production)
CREATE POLICY "Allow all on branding_settings" ON branding_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default branding settings
INSERT INTO branding_settings (setting_key, setting_value) VALUES
  -- Company Information
  ('company_name', 'Client Consultation Booking'),
  ('company_tagline', 'Complete our AI-powered screening process to ensure we''re the right fit for your needs'),
  ('company_website', ''),
  ('company_email', ''),
  ('company_phone', ''),

  -- Visual Branding
  ('logo_url', ''),
  ('favicon_url', ''),
  ('primary_color', '#C4705A'),
  ('secondary_color', '#6B8E6F'),
  ('background_color', '#FAF8F5'),
  ('text_color', '#2A2A2A'),
  ('heading_font', 'Playfair Display'),
  ('body_font', 'Inter'),

  -- Footer & Legal
  ('footer_text', ''),
  ('privacy_policy_url', ''),
  ('terms_of_service_url', ''),

  -- Social Media
  ('social_twitter', ''),
  ('social_linkedin', ''),
  ('social_facebook', ''),
  ('social_instagram', ''),

  -- White Label Settings
  ('white_label_enabled', 'false'),
  ('powered_by_text', 'Powered by Your Company'),
  ('custom_css', ''),

  -- Embed Settings
  ('embed_enabled', 'true'),
  ('embed_domain_whitelist', '*')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branding_settings_key ON branding_settings(setting_key);
