import { useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { StepIndicator } from './components/StepIndicator';
import { ScreeningOne, ScreeningOneData } from './components/ScreeningOne';
import { ScreeningTwo, ScreeningTwoData } from './components/ScreeningTwo';
import { BookingCalendar } from './components/BookingCalendar';
import { Confirmation } from './components/Confirmation';
import { supabase } from '../lib/supabase';
import { analyzeScreening, AIAnalysis } from '../lib/screening';

type Step = 'screening-one' | 'screening-two' | 'booking' | 'confirmation';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('screening-one');
  const [screeningOneData, setScreeningOneData] = useState<ScreeningOneData | null>(null);
  const [, setScreeningTwoData] = useState<ScreeningTwoData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  // The DB row id for this session. Every subsequent update targets this id
  // specifically, instead of matching on email (which would collide across
  // repeat submissions from the same address).
  const [responseId, setResponseId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<{
    date: Date;
    time: string;
    name: string;
    email: string;
  } | null>(null);

  const steps = ['Initial Screening', 'Detailed Info', 'Book Time', 'Confirmed'];
  const stepIndex = {
    'screening-one': 0,
    'screening-two': 1,
    'booking': 2,
    'confirmation': 3,
  }[currentStep];

  const handleScreeningOneComplete = async (data: ScreeningOneData) => {
    setScreeningOneData(data);

    // Generate the AI analysis (real Claude when configured, else rule-based).
    const analysis = await analyzeScreening(data);
    setAiAnalysis(analysis);

    // Persist the initial screening and capture the new row id.
    const { data: inserted, error } = await supabase
      .from('screening_responses')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        service_interest: data.serviceInterest,
        budget_range: data.budgetRange,
        timeline: data.timeline,
        description: data.description,
        screening_one_completed: true,
        ai_analysis: analysis.alignment,
        alignment_score: analysis.score,
        status: 'screening_two',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving screening data:', error);
      toast.error("We couldn't save your responses, but you can keep going.", {
        description: 'Your progress is kept locally for this session.',
      });
    } else {
      setResponseId(inserted.id);
    }

    setCurrentStep('screening-two');
  };

  const handleScreeningTwoComplete = async (data: ScreeningTwoData) => {
    setScreeningTwoData(data);

    if (responseId) {
      // Save the detailed answers (previously these were dropped entirely).
      const { error } = await supabase
        .from('screening_responses')
        .update({
          goals: data.goals,
          challenges: data.challenges,
          previous_experience: data.previousExperience,
          additional_notes: data.additionalNotes,
          screening_two_completed: true,
          status: 'booking',
        })
        .eq('id', responseId);

      if (error) {
        console.error('Error updating screening data:', error);
        toast.error("We couldn't save your detailed answers.", {
          description: 'You can still continue to booking.',
        });
      }
    }

    setCurrentStep('booking');
  };

  const handleBooking = async (date: Date, time: string) => {
    if (!screeningOneData) return;

    const details = {
      date,
      time,
      name: screeningOneData.name,
      email: screeningOneData.email,
    };
    setBookingDetails(details);

    if (responseId) {
      const { error } = await supabase
        .from('screening_responses')
        .update({
          booking_date: date.toISOString(),
          booking_time: time,
          status: 'booked',
        })
        .eq('id', responseId);

      if (error) {
        console.error('Error saving booking:', error);
        toast.error("We couldn't confirm your booking in our system.", {
          description: 'Please reach out so we can lock in your time.',
        });
      }
    }

    setCurrentStep('confirmation');
  };

  const handleStartOver = () => {
    setCurrentStep('screening-one');
    setScreeningOneData(null);
    setScreeningTwoData(null);
    setAiAnalysis(null);
    setResponseId(null);
    setBookingDetails(null);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <Toaster richColors position="top-center" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-3">Client Consultation Booking</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Complete our AI-powered screening process to ensure we're the right fit for your needs,
            then schedule your personalized consultation.
          </p>
        </div>

        {/* Step Indicator */}
        {currentStep !== 'confirmation' && (
          <div className="mb-12">
            <StepIndicator currentStep={stepIndex} steps={steps} />
          </div>
        )}

        {/* Current Step Content */}
        <div className="bg-card/50 rounded-xl p-8">
          {currentStep === 'screening-one' && (
            <ScreeningOne onComplete={handleScreeningOneComplete} />
          )}

          {currentStep === 'screening-two' && aiAnalysis && (
            <ScreeningTwo aiAnalysis={aiAnalysis} onComplete={handleScreeningTwoComplete} />
          )}

          {currentStep === 'booking' && <BookingCalendar onBook={handleBooking} />}

          {currentStep === 'confirmation' && bookingDetails && (
            <Confirmation bookingDetails={bookingDetails} onStartOver={handleStartOver} />
          )}
        </div>
      </div>
    </div>
  );
}
