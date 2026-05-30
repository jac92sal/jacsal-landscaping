import { useState } from 'react';

interface ScreeningOneProps {
  onComplete: (data: ScreeningOneData) => void;
}

export interface ScreeningOneData {
  name: string;
  email: string;
  phone: string;
  serviceInterest: string;
  budgetRange: string;
  timeline: string;
  description: string;
}

export function ScreeningOne({ onComplete }: ScreeningOneProps) {
  const [formData, setFormData] = useState<ScreeningOneData>({
    name: '',
    email: '',
    phone: '',
    serviceInterest: '',
    budgetRange: '',
    timeline: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const isFormValid = formData.name && formData.email && formData.serviceInterest && formData.description;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="mb-2">Tell Us About Your Project</h2>
        <p className="text-muted-foreground">
          A few basics so we know who you are and what you need.
        </p>
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

      <div className="space-y-2">
        <label htmlFor="serviceInterest" className="block">
          Service Interest <span className="text-destructive">*</span>
        </label>
        <select
          id="serviceInterest"
          required
          value={formData.serviceInterest}
          onChange={(e) => setFormData({ ...formData, serviceInterest: e.target.value })}
          className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a service...</option>
          <option value="consulting">Consulting Services</option>
          <option value="design">Design & Creative</option>
          <option value="development">Development & Engineering</option>
          <option value="marketing">Marketing & Strategy</option>
          <option value="other">Other</option>
        </select>
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
          Project Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={5}
          className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Tell us about your project and what you're hoping to achieve..."
        />
      </div>

      <button
        type="submit"
        disabled={!isFormValid}
        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </form>
  );
}
