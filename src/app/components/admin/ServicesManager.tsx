import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Loader2, List } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Service {
  id: string;
  service_name: string;
  service_value: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    service_name: '',
    service_value: '',
    description: '',
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.service_name || !formData.service_value) return;

    try {
      const maxOrder = Math.max(...services.map((s) => s.sort_order), 0);

      const { error } = await supabase.from('services_config').insert({
        service_name: formData.service_name,
        service_value: formData.service_value,
        description: formData.description,
        sort_order: maxOrder + 1,
      });

      if (error) throw error;

      setFormData({ service_name: '', service_value: '', description: '' });
      setShowAddForm(false);
      loadServices();
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error adding service. Please try again.');
    }
  };

  const handleUpdate = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;

    try {
      const { error } = await supabase
        .from('services_config')
        .update({
          service_name: service.service_name,
          service_value: service.service_value,
          description: service.description,
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      loadServices();
    } catch (error) {
      console.error('Error updating service:', error);
      alert('Error updating service. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const { error } = await supabase.from('services_config').delete().eq('id', id);

      if (error) throw error;
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Error deleting service. Please try again.');
    }
  };

  const toggleActive = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;

    try {
      const { error } = await supabase
        .from('services_config')
        .update({ is_active: !service.is_active })
        .eq('id', id);

      if (error) throw error;
      loadServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      alert('Error updating service. Please try again.');
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">Services</h2>
          <p className="text-muted-foreground">
            Manage available services shown in the booking form
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Add New Service</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ service_name: '', service_value: '', description: '' });
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2">Service Name (Display)</label>
              <input
                type="text"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Web Development"
              />
            </div>

            <div>
              <label className="block mb-2">Service Value (Internal ID)</label>
              <input
                type="text"
                value={formData.service_value}
                onChange={(e) => setFormData({ ...formData, service_value: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                placeholder="e.g., web-development"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use lowercase with hyphens, no spaces
              </p>
            </div>

            <div>
              <label className="block mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Brief description of this service"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={!formData.service_name || !formData.service_value}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Service
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-3">
        {services.map((service) => {
          const isEditing = editingId === service.id;

          return (
            <div
              key={service.id}
              className={`bg-card border rounded-lg p-4 ${
                service.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 hover:bg-muted rounded-lg cursor-grab">
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="p-2 bg-primary/10 rounded-lg">
                  <List className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={service.service_name}
                        onChange={(e) => {
                          setServices(
                            services.map((s) =>
                              s.id === service.id ? { ...s, service_name: e.target.value } : s
                            )
                          );
                        }}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Service Name"
                      />
                      <input
                        type="text"
                        value={service.service_value}
                        onChange={(e) => {
                          setServices(
                            services.map((s) =>
                              s.id === service.id ? { ...s, service_value: e.target.value } : s
                            )
                          );
                        }}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                        placeholder="service-value"
                      />
                      <input
                        type="text"
                        value={service.description || ''}
                        onChange={(e) => {
                          setServices(
                            services.map((s) =>
                              s.id === service.id ? { ...s, description: e.target.value } : s
                            )
                          );
                        }}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="font-medium mb-1">{service.service_name}</div>
                      <div className="font-mono text-sm text-muted-foreground mb-1">
                        {service.service_value}
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={service.is_active}
                      onChange={() => toggleActive(service.id)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">Active</span>
                  </label>

                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleUpdate(service.id)}
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
                        onClick={() => setEditingId(service.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
