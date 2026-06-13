import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Loader2, List, Sparkles } from 'lucide-react';
import {
  Service,
  fetchServices,
  seedServicesIfEmpty,
  createService,
  updateService,
  deleteService,
  formatServiceMeta,
} from '../../../lib/servicesApi';

const EMPTY_FORM = {
  service_name: '',
  service_value: '',
  description: '',
  duration_minutes: 30,
  price: 0,
  is_free: false,
};

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setServices(await fetchServices());
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const seeded = await seedServicesIfEmpty();
      setServices(seeded);
    } catch (error) {
      console.error('Error seeding services:', error);
      alert(`Error seeding default services. Please try again. ${error}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.service_name || !formData.service_value) return;
    try {
      await createService(formData);
      setFormData({ ...EMPTY_FORM });
      setShowAddForm(false);
      loadServices();
    } catch (error) {
      console.error('Error adding service:', error);
      alert(`Error adding service. Please try again. ${error}`);
    }
  };

  const handleUpdate = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;
    try {
      await updateService(id, service);
      setEditingId(null);
      loadServices();
    } catch (error) {
      console.error('Error updating service:', error);
      alert(`Error updating service. Please try again. ${error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert(`Error deleting service. Please try again. ${error}`);
    }
  };

  const toggleActive = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (!service) return;
    try {
      await updateService(id, { is_active: !service.is_active });
      loadServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      alert(`Error updating service. Please try again. ${error}`);
    }
  };

  const patchLocal = (id: string, patch: Partial<Service>) => {
    setServices(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
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
        <div className="flex items-center gap-2">
          {services.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Load Default Services
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Add New Service</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ ...EMPTY_FORM });
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
                placeholder="e.g., Advisory Call"
              />
            </div>

            <div>
              <label className="block mb-2">Service Value (Internal ID)</label>
              <input
                type="text"
                value={formData.service_value}
                onChange={(e) => setFormData({ ...formData, service_value: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                placeholder="e.g., advisory-call"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use lowercase with hyphens, no spaces
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block mb-2">Price (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={formData.is_free}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm">Free</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block mb-2">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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

      {services.length === 0 && !showAddForm && (
        <div className="bg-card border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-1">No services yet.</p>
          <p className="text-sm text-muted-foreground">
            Click “Load Default Services” to seed your Milah Grace Co. offers, or add one manually.
          </p>
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
                        onChange={(e) => patchLocal(service.id, { service_name: e.target.value })}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Service Name"
                      />
                      <input
                        type="text"
                        value={service.service_value}
                        onChange={(e) => patchLocal(service.id, { service_value: e.target.value })}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                        placeholder="service-value"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={0}
                          value={service.duration_minutes}
                          onChange={(e) =>
                            patchLocal(service.id, { duration_minutes: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          placeholder="Minutes"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={service.is_free}
                          value={service.price}
                          onChange={(e) => patchLocal(service.id, { price: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm disabled:opacity-50"
                          placeholder="Price"
                        />
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={service.is_free}
                            onChange={(e) =>
                              patchLocal(service.id, {
                                is_free: e.target.checked,
                                price: e.target.checked ? 0 : service.price,
                              })
                            }
                            className="w-4 h-4 rounded border-border"
                          />
                          Free
                        </label>
                      </div>
                      <textarea
                        rows={3}
                        value={service.description || ''}
                        onChange={(e) => patchLocal(service.id, { description: e.target.value })}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="font-medium mb-1">{service.service_name}</div>
                      <div className="text-sm text-secondary mb-1">{formatServiceMeta(service)}</div>
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
                        onClick={() => {
                          setEditingId(null);
                          loadServices();
                        }}
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
