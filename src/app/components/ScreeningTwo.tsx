import { useState } from 'react';

interface ScreeningTwoProps {
  onComplete: (data: ScreeningTwoData) => void;
}

export interface ScreeningTwoData {
  goals: string;
  challenges: string;
  previousExperience: string;
  additionalNotes: string;
}

export function ScreeningTwo({ onComplete }: ScreeningTwoProps) {
  const [formData, setFormData] = useState<ScreeningTwoData>({
    goals: '',
    challenges: '',
    previousExperience: '',
    additionalNotes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const isFormValid = formData.goals && formData.challenges;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="mb-2">Detailed Information</h2>
          <p className="text-muted-foreground">
            Help us prepare for your consultation with more context about your needs.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="goals" className="block">
            What are your primary goals? <span className="text-destructive">*</span>
          </label>
          <textarea
            id="goals"
            required
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Describe what you want to achieve..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="challenges" className="block">
            What challenges are you facing? <span className="text-destructive">*</span>
          </label>
          <textarea
            id="challenges"
            required
            value={formData.challenges}
            onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="What obstacles or pain points are you experiencing?"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="previousExperience" className="block">
            Previous Experience
          </label>
          <textarea
            id="previousExperience"
            value={formData.previousExperience}
            onChange={(e) => setFormData({ ...formData, previousExperience: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Have you worked with similar services before? What was your experience?"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="additionalNotes" className="block">
            Additional Notes
          </label>
          <textarea
            id="additionalNotes"
            value={formData.additionalNotes}
            onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Anything else you'd like us to know?"
          />
        </div>

        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Booking
        </button>
      </form>
    </div>
  );
}
