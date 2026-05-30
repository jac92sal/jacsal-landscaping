import { useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface ScreeningTwoProps {
  aiAnalysis: {
    alignment: string;
    score: number;
    recommendations: string[];
  };
  onComplete: (data: ScreeningTwoData) => void;
}

export interface ScreeningTwoData {
  goals: string;
  challenges: string;
  previousExperience: string;
  additionalNotes: string;
}

export function ScreeningTwo({ aiAnalysis, onComplete }: ScreeningTwoProps) {
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
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1">AI Analysis Results</h3>
            <p className="text-muted-foreground">
              Based on your initial responses, here's our assessment
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl text-primary">{aiAnalysis.score}%</div>
            <div className="text-sm text-muted-foreground">Match</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm mb-2">Service Alignment</h4>
            <p className="text-foreground">{aiAnalysis.alignment}</p>
          </div>

          <div>
            <h4 className="text-sm mb-2">Recommendations</h4>
            <ul className="space-y-2">
              {aiAnalysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

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
