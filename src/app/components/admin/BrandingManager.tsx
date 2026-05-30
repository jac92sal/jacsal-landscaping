import { useState, useEffect } from 'react';
import { Save, Upload, Loader2, Palette, Type, Link as LinkIcon, Eye } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface BrandingSettings {
  company_name: string;
  company_tagline: string;
  company_website: string;
  company_email: string;
  company_phone: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  footer_text: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  social_twitter: string;
  social_linkedin: string;
  social_facebook: string;
  social_instagram: string;
  white_label_enabled: string;
  powered_by_text: string;
  custom_css: string;
}

export function BrandingManager() {
  const [settings, setSettings] = useState<Partial<BrandingSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'visual' | 'social' | 'advanced'>('company');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('branding_settings').select('*');

      if (error) throw error;

      const settingsObj: Partial<BrandingSettings> = {};
      data?.forEach((setting) => {
        settingsObj[setting.setting_key as keyof BrandingSettings] = setting.setting_value;
      });

      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading branding settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value || '',
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('branding_settings')
          .update({ setting_value: update.setting_value, updated_at: new Date().toISOString() })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      alert('Branding settings saved successfully!');
    } catch (error) {
      console.error('Error saving branding settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof BrandingSettings, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">Branding</h2>
          <p className="text-muted-foreground">
            Customize your booking system's appearance and company information
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'company', label: 'Company Info', icon: LinkIcon },
          { id: 'visual', label: 'Visual Branding', icon: Palette },
          { id: 'social', label: 'Social & Legal', icon: LinkIcon },
          { id: 'advanced', label: 'Advanced', icon: Type },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Company Info Tab */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Company Information</h3>

            <div>
              <label className="block mb-2">Company Name *</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => updateSetting('company_name', e.target.value)}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block mb-2">Tagline / Description</label>
              <textarea
                value={settings.company_tagline || ''}
                onChange={(e) => updateSetting('company_tagline', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Brief description shown on the booking page"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Website URL</label>
                <input
                  type="url"
                  value={settings.company_website || ''}
                  onChange={(e) => updateSetting('company_website', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div>
                <label className="block mb-2">Contact Email</label>
                <input
                  type="email"
                  value={settings.company_email || ''}
                  onChange={(e) => updateSetting('company_email', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="contact@yourcompany.com"
                />
              </div>

              <div>
                <label className="block mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={settings.company_phone || ''}
                  onChange={(e) => updateSetting('company_phone', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Branding Tab */}
      {activeTab === 'visual' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Logo & Icons</h3>

            <div>
              <label className="block mb-2">Logo URL</label>
              <input
                type="url"
                value={settings.logo_url || ''}
                onChange={(e) => updateSetting('logo_url', e.target.value)}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://yourcdn.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: PNG or SVG, max 200px height
              </p>
            </div>

            <div>
              <label className="block mb-2">Favicon URL</label>
              <input
                type="url"
                value={settings.favicon_url || ''}
                onChange={(e) => updateSetting('favicon_url', e.target.value)}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://yourcdn.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 32x32px or 64x64px .ico or .png
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Color Scheme</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.primary_color || '#C4705A'}
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color || '#C4705A'}
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.secondary_color || '#6B8E6F'}
                    onChange={(e) => updateSetting('secondary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondary_color || '#6B8E6F'}
                    onChange={(e) => updateSetting('secondary_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2">Background</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.background_color || '#FAF8F5'}
                    onChange={(e) => updateSetting('background_color', e.target.value)}
                    className="w-12 h-10 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.background_color || '#FAF8F5'}
                    onChange={(e) => updateSetting('background_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.text_color || '#2A2A2A'}
                    onChange={(e) => updateSetting('text_color', e.target.value)}
                    className="w-12 h-10 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.text_color || '#2A2A2A'}
                    onChange={(e) => updateSetting('text_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Typography</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Heading Font</label>
                <select
                  value={settings.heading_font || 'Playfair Display'}
                  onChange={(e) => updateSetting('heading_font', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Playfair Display">Playfair Display (Serif)</option>
                  <option value="Inter">Inter (Sans-serif)</option>
                  <option value="Lora">Lora (Serif)</option>
                  <option value="Montserrat">Montserrat (Sans-serif)</option>
                  <option value="Raleway">Raleway (Sans-serif)</option>
                  <option value="Merriweather">Merriweather (Serif)</option>
                </select>
              </div>

              <div>
                <label className="block mb-2">Body Font</label>
                <select
                  value={settings.body_font || 'Inter'}
                  onChange={(e) => updateSetting('body_font', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Inter">Inter (Sans-serif)</option>
                  <option value="Open Sans">Open Sans (Sans-serif)</option>
                  <option value="Roboto">Roboto (Sans-serif)</option>
                  <option value="Lato">Lato (Sans-serif)</option>
                  <option value="Source Sans Pro">Source Sans Pro (Sans-serif)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social & Legal Tab */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Social Media Links</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Twitter / X</label>
                <input
                  type="url"
                  value={settings.social_twitter || ''}
                  onChange={(e) => updateSetting('social_twitter', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://twitter.com/yourcompany"
                />
              </div>

              <div>
                <label className="block mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={settings.social_linkedin || ''}
                  onChange={(e) => updateSetting('social_linkedin', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>

              <div>
                <label className="block mb-2">Facebook</label>
                <input
                  type="url"
                  value={settings.social_facebook || ''}
                  onChange={(e) => updateSetting('social_facebook', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://facebook.com/yourcompany"
                />
              </div>

              <div>
                <label className="block mb-2">Instagram</label>
                <input
                  type="url"
                  value={settings.social_instagram || ''}
                  onChange={(e) => updateSetting('social_instagram', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://instagram.com/yourcompany"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Legal Pages</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Privacy Policy URL</label>
                <input
                  type="url"
                  value={settings.privacy_policy_url || ''}
                  onChange={(e) => updateSetting('privacy_policy_url', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://yourcompany.com/privacy"
                />
              </div>

              <div>
                <label className="block mb-2">Terms of Service URL</label>
                <input
                  type="url"
                  value={settings.terms_of_service_url || ''}
                  onChange={(e) => updateSetting('terms_of_service_url', e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://yourcompany.com/terms"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Footer</h3>

            <div>
              <label className="block mb-2">Footer Text</label>
              <textarea
                value={settings.footer_text || ''}
                onChange={(e) => updateSetting('footer_text', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="© 2026 Your Company. All rights reserved."
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>White Label Settings</h3>

            <label className="flex items-center gap-2 cursor-pointer p-4 border border-border rounded-lg hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={settings.white_label_enabled === 'true'}
                onChange={(e) =>
                  updateSetting('white_label_enabled', e.target.checked ? 'true' : 'false')
                }
                className="w-4 h-4 rounded border-border"
              />
              <div>
                <span className="font-medium">Enable White Label Mode</span>
                <p className="text-sm text-muted-foreground">
                  Remove all third-party branding from your booking system
                </p>
              </div>
            </label>

            <div>
              <label className="block mb-2">"Powered by" Text</label>
              <input
                type="text"
                value={settings.powered_by_text || ''}
                onChange={(e) => updateSetting('powered_by_text', e.target.value)}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Powered by Your Company"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to hide completely in white label mode
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3>Custom CSS</h3>

            <div>
              <label className="block mb-2">Additional CSS</label>
              <textarea
                value={settings.custom_css || ''}
                onChange={(e) => updateSetting('custom_css', e.target.value)}
                rows={8}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-sm"
                placeholder=".booking-form { border-radius: 20px; }"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Advanced: Add custom CSS to override styles. Use with caution.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
