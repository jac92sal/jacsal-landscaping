import { useState, useEffect } from 'react';
import { Key, Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

type TestResult = { ok: boolean; message: string };

interface Secret {
  id: string;
  key_name: string;
  key_value: string;
  description: string;
  is_active: boolean;
}

const COMMON_SECRETS = [
  { name: 'OPENAI_API_KEY', description: 'OpenAI API key for AI analysis' },
  { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude AI' },
  { name: 'GOOGLE_CALENDAR_API_KEY', description: 'Google Calendar API key' },
  { name: 'GOOGLE_CALENDAR_CLIENT_ID', description: 'Google Calendar OAuth Client ID' },
  { name: 'GOOGLE_CALENDAR_CLIENT_SECRET', description: 'Google Calendar OAuth Client Secret' },
  { name: 'RESEND_API_KEY', description: 'Resend API key for email notifications' },
  { name: 'SENDGRID_API_KEY', description: 'SendGrid API key for email' },
  { name: 'TWILIO_ACCOUNT_SID', description: 'Twilio Account SID for SMS' },
  { name: 'TWILIO_AUTH_TOKEN', description: 'Twilio Auth Token' },
];

export function SecretsVault() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [formData, setFormData] = useState({
    key_name: '',
    key_value: '',
    description: '',
  });

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    try {
      const { data, error } = await supabase
        .from('secrets_vault')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSecrets(data || []);
    } catch (error) {
      console.error('Error loading secrets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.key_name || !formData.key_value) return;

    try {
      const { error } = await supabase.from('secrets_vault').insert({
        key_name: formData.key_name,
        key_value: formData.key_value,
        description: formData.description,
      });

      if (error) throw error;

      setFormData({ key_name: '', key_value: '', description: '' });
      setShowAddForm(false);
      loadSecrets();
    } catch (error) {
      console.error('Error adding secret:', error);
      alert('Error adding secret. Please try again.');
    }
  };

  const handleUpdate = async (id: string) => {
    const secret = secrets.find((s) => s.id === id);
    if (!secret) return;

    try {
      const { error } = await supabase
        .from('secrets_vault')
        .update({
          key_value: secret.key_value,
          description: secret.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      loadSecrets();
    } catch (error) {
      console.error('Error updating secret:', error);
      alert('Error updating secret. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this secret?')) return;

    try {
      const { error } = await supabase.from('secrets_vault').delete().eq('id', id);

      if (error) throw error;
      loadSecrets();
    } catch (error) {
      console.error('Error deleting secret:', error);
      alert('Error deleting secret. Please try again.');
    }
  };

  const handleTest = async (secret: Secret) => {
    setTesting((prev) => new Set(prev).add(secret.id));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[secret.id];
      return next;
    });
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e8cd329a/secrets/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ key_name: secret.key_name }),
        }
      );
      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch (parseError) {
        console.error(
          `Non-JSON response from secret test endpoint for ${secret.key_name} (status ${res.status}):`,
          raw,
          parseError
        );
        setTestResults((prev) => ({
          ...prev,
          [secret.id]: {
            ok: false,
            message: `Server returned non-JSON (status ${res.status}). First chars: ${raw.slice(0, 120)}`,
          },
        }));
        return;
      }
      const message = data.ok
        ? data.message || 'Key is valid'
        : data.error || `Test failed (status ${data.status ?? res.status})`;
      if (!data.ok) {
        console.error(`Secret test failed for ${secret.key_name}:`, data);
      }
      setTestResults((prev) => ({ ...prev, [secret.id]: { ok: !!data.ok, message } }));
    } catch (error) {
      console.error(`Error calling secret test endpoint for ${secret.key_name}:`, error);
      setTestResults((prev) => ({
        ...prev,
        [secret.id]: { ok: false, message: `Network error: ${error}` },
      }));
    } finally {
      setTesting((prev) => {
        const next = new Set(prev);
        next.delete(secret.id);
        return next;
      });
    }
  };

  const toggleVisibility = (id: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleSecrets(newVisible);
  };

  const quickAdd = (name: string, description: string) => {
    setFormData({ key_name: name, key_value: '', description });
    setShowAddForm(true);
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
          <h2 className="mb-2">Secrets Vault</h2>
          <p className="text-muted-foreground">
            Securely store API keys and credentials for integrations
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Secret
        </button>
      </div>

      {/* Quick Add Common Secrets */}
      {secrets.length === 0 && !showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="mb-4">Quick Add Common Secrets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COMMON_SECRETS.map((secret) => (
              <button
                key={secret.name}
                onClick={() => quickAdd(secret.name, secret.description)}
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Key className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-mono text-sm">{secret.name}</div>
                  <div className="text-xs text-muted-foreground">{secret.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Add New Secret</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ key_name: '', key_value: '', description: '' });
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2">Key Name</label>
              <input
                type="text"
                value={formData.key_name}
                onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                placeholder="e.g., OPENAI_API_KEY"
              />
            </div>

            <div>
              <label className="block mb-2">API Key / Secret Value</label>
              <input
                type="password"
                value={formData.key_value}
                onChange={(e) => setFormData({ ...formData, key_value: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className="block mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="What is this key used for?"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={!formData.key_name || !formData.key_value}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Secret
            </button>
          </div>
        </div>
      )}

      {/* Secrets List */}
      {secrets.length > 0 && (
        <div className="space-y-3">
          {secrets.map((secret) => {
            const isEditing = editingId === secret.id;
            const isVisible = visibleSecrets.has(secret.id);

            return (
              <div key={secret.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Key className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm mb-1">{secret.key_name}</div>

                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={secret.key_value}
                          onChange={(e) => {
                            setSecrets(
                              secrets.map((s) =>
                                s.id === secret.id ? { ...s, key_value: e.target.value } : s
                              )
                            );
                          }}
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                        />
                        <input
                          type="text"
                          value={secret.description || ''}
                          onChange={(e) => {
                            setSecrets(
                              secrets.map((s) =>
                                s.id === secret.id ? { ...s, description: e.target.value } : s
                              )
                            );
                          }}
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          placeholder="Description"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-mono text-sm text-muted-foreground">
                          {isVisible ? secret.key_value : '••••••••••••••••'}
                        </div>
                        {secret.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {secret.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(secret)}
                      disabled={testing.has(secret.id) || isEditing}
                      className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                      title="Test this key against the provider"
                    >
                      {testing.has(secret.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleVisibility(secret.id)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title={isVisible ? 'Hide' : 'Show'}
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>

                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(secret.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-secondary"
                          title="Save"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(secret.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(secret.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {testResults[secret.id] && (
                  <div
                    className={`mt-3 ml-14 flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
                      testResults[secret.id].ok
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {testResults[secret.id].ok ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="break-words">{testResults[secret.id].message}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
