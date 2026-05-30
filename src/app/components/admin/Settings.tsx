import { useState, useEffect } from 'react';
import { Save, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Setting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
}

interface TimeSlot {
  id: string;
  time_slot: string;
  is_active: boolean;
  sort_order: number;
}

export function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTimeSlots();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('*');

      if (error) throw error;

      const settingsObj: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });

      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTimeSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('time_slots_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTimeSlots(data || []);
    } catch (error) {
      console.error('Error loading time slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ setting_value: update.setting_value, updated_at: new Date().toISOString() })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTimeSlot = async (id: string) => {
    const slot = timeSlots.find((s) => s.id === id);
    if (!slot) return;

    try {
      const { error } = await supabase
        .from('time_slots_config')
        .update({ is_active: !slot.is_active })
        .eq('id', id);

      if (error) throw error;
      loadTimeSlots();
    } catch (error) {
      console.error('Error toggling time slot:', error);
      alert('Error updating time slot. Please try again.');
    }
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
      <div>
        <h2 className="mb-2">Settings</h2>
        <p className="text-muted-foreground">Configure your application settings</p>
      </div>

      {/* App Settings */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3>Application Settings</h3>

        <div>
          <label className="block mb-2">Application Name</label>
          <input
            type="text"
            value={settings.app_name || ''}
            onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block mb-2">Application Description</label>
          <textarea
            value={settings.app_description || ''}
            onChange={(e) => setSettings({ ...settings, app_description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer p-4 border border-border rounded-lg hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={settings.ai_enabled === 'true'}
              onChange={(e) =>
                setSettings({ ...settings, ai_enabled: e.target.checked ? 'true' : 'false' })
              }
              className="w-4 h-4 rounded border-border"
            />
            <span>Enable AI Analysis</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-4 border border-border rounded-lg hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={settings.email_notifications_enabled === 'true'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_notifications_enabled: e.target.checked ? 'true' : 'false',
                })
              }
              className="w-4 h-4 rounded border-border"
            />
            <span>Email Notifications</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-4 border border-border rounded-lg hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={settings.google_calendar_enabled === 'true'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  google_calendar_enabled: e.target.checked ? 'true' : 'false',
                })
              }
              className="w-4 h-4 rounded border-border"
            />
            <span>Google Calendar</span>
          </label>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Time Slots */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3>Available Time Slots</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timeSlots.map((slot) => (
            <label
              key={slot.id}
              className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                slot.is_active
                  ? 'border-primary bg-primary/5 hover:bg-primary/10'
                  : 'border-border opacity-50 hover:opacity-75'
              }`}
            >
              <input
                type="checkbox"
                checked={slot.is_active}
                onChange={() => toggleTimeSlot(slot.id)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="font-mono text-sm">{slot.time_slot}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
