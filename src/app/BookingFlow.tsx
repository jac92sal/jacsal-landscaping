import { useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { StepIndicator } from './components/StepIndicator';
import { ScreeningOne, ScreeningOneData } from './components/ScreeningOne';
import { RequestTimes, RequestedTime } from './components/RequestTimes';
import { ScreeningChat } from './components/ScreeningChat';
import { RequestSent } from './components/RequestSent';
import { supabase } from '../lib/supabase';
import { QA, ScreenAnalysis } from '../lib/screening';

type Step = 'contact' | 'times' | 'screening' | 'sent';

export function BookingFlow() {
  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [contact, setContact] = useState<ScreeningOneData | null>(null);
  const [requestedTimes, setRequestedTimes] = useState<RequestedTime[]>([]);

  const steps = ['Your Details', 'Preferred Times', 'A Few Questions', 'Sent'];
  const stepIndex = { contact: 0, times: 1, screening: 2, sent: 3 }[currentStep];

  const handleContact = (data: ScreeningOneData) => {
    setContact(data);
    setCurrentStep('times');
  };

  const handleTimes = (times: RequestedTime[]) => {
    setRequestedTimes(times);
    setCurrentStep('screening');
  };

  const handleScreeningComplete = async (history: QA[], analysis: ScreenAnalysis | null) => {
    if (!contact) return;

    const { error } = await supabase.from('screening_responses').insert({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      service_interest: contact.serviceInterest,
      budget_range: contact.budgetRange,
      timeline: contact.timeline,
      description: contact.description,
      requested_times: requestedTimes,
      conversation: { history, analysis },
      ai_analysis: analysis?.summary ?? null,
      alignment_score: analysis?.score ?? null,
      screening_one_completed: true,
      screening_two_completed: true,
      status: 'requested',
    });

    if (error) {
      console.error('Error saving request:', error);
      toast.error("We couldn't submit your request automatically.", {
        description: 'Please reach out directly and we\'ll get you scheduled.',
      });
    }

    setCurrentStep('sent');
  };

  const handleStartOver = () => {
    setContact(null);
    setRequestedTimes([]);
    setCurrentStep('contact');
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <Toaster richColors position="top-center" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <img
            src="/logo200x200.png"
            alt="JacSal Services — Supporting Dreams"
            className="h-24 w-auto mx-auto mb-4"
          />
          <h1 className="mb-3">Request a Consultation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Share a few details and your preferred times. Our assistant will ask a couple of quick
            questions, then we'll review and confirm your consultation by email.
          </p>
        </div>

        {/* Step Indicator */}
        {currentStep !== 'sent' && (
          <div className="mb-12">
            <StepIndicator currentStep={stepIndex} steps={steps} />
          </div>
        )}

        {/* Current Step Content */}
        <div className="bg-card/50 rounded-xl p-8">
          {currentStep === 'contact' && <ScreeningOne onComplete={handleContact} />}

          {currentStep === 'times' && <RequestTimes onComplete={handleTimes} />}

          {currentStep === 'screening' && contact && (
            <ScreeningChat
              contact={{
                name: contact.name,
                serviceInterest: contact.serviceInterest,
                description: contact.description,
                budgetRange: contact.budgetRange,
                timeline: contact.timeline,
              }}
              onComplete={handleScreeningComplete}
            />
          )}

          {currentStep === 'sent' && contact && (
            <RequestSent
              email={contact.email}
              requestedTimes={requestedTimes}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>
    </div>
  );
}
