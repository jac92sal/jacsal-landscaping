import { useState, useEffect } from 'react';
import { Loader2, Check, Clock } from 'lucide-react';
import { Service, fetchServices, formatServiceMeta } from '../../lib/servicesApi';

interface ScreeningOneProps {
  onComplete: (data: ScreeningOneData) => void;
}

export interface ScreeningOneData {
  name: string;
  email: string;
  phone: string;
  serviceInterest: string;
  serviceName: string;
  budgetRange: string;
  timeline: string;
  description: string;
}

const DESCRIPTION_PREVIEW = 160;

export function ScreeningOne({ onComplete }: ScreeningOneProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<ScreeningOneData>({
    name: '',
    email: '',
    phone: '',
    serviceInterest: '',
    serviceName: '',
    budgetRange: '',
    timeline: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchServices();
        setServices(all.filter((s) => s.is_active));
      } catch (error) {
        console.error('Error loading services for booking form:', error);
      } finally {
        setIsLoadingServices(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onComplete(formData);
    setIsSubmitting(false);
  };

  const selectService = (service: Service) => {
    setFormData({
      ...formData,
      serviceInterest: service.service_value,
      serviceName: service.service_name,
    });
  };

  const isFormValid =
    formData.name && formData.email && formData.serviceInterest && formData.description;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="mb-2">Select Appointment</h2>
        <p className="text-muted-foreground">
          Choose the offer that best fits your needs, then tell us a little about yourself.
        </p>
      </div>

      {/* Service selection */}
      <div className="space-y-3">
        <label className="block">
          Service <span className="text-destructive">*</span>
        </label>

        {isLoadingServices ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No services are currently available. Please check back soon.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => {
              const isSelected = formData.serviceInterest === service.service_value;
              const isExpanded = expanded[service.id];
              const longDescription =
                service.description && service.description.length > DESCRIPTION_PREVIEW;
              const shownDescription =
                longDescription && !isExpanded
                  ? `${service.description.slice(0, DESCRIPTION_PREVIEW).trimEnd()}...`
                  : service.description;

              return (
                <div
                  key={service.id}
                  className={`rounded-xl border p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => selectService(service)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{service.service_name}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-secondary mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        {formatServiceMeta(service)}
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">
                          {shownDescription}
                          {longDescription && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpanded({ ...expanded, [service.id]: !isExpanded });
                              }}
                              className="ml-1 text-primary hover:underline"
                            >
                              {isExpanded ? 'Show Less' : 'Show All'}
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectService(service);
                      }}
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Book'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="name" className="block">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Your full name"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="block">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="budgetRange" className="block">
            Budget Range
          </label>
          <select
            id="budgetRange"
            value={formData.budgetRange}
            onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select budget...</option>
            <option value="<5k">Less than $5,000</option>
            <option value="5k-15k">$5,000 - $15,000</option>
            <option value="15k-50k">$15,000 - $50,000</option>
            <option value="50k+">$50,000+</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="timeline" className="block">
            Timeline
          </label>
          <select
            id="timeline"
            value={formData.timeline}
            onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select timeline...</option>
            <option value="urgent">Urgent (Within 2 weeks)</option>
            <option value="1-2months">1-2 months</option>
            <option value="3-6months">3-6 months</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block">
          What would you like to focus on? <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={5}
          className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Tell us about your business or career and what you're hoping to achieve..."
        />
      </div>

      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing with AI...
          </>
        ) : (
          'Continue to Next Step'
        )}
      </button>
    </form>
  );
}
