import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { ScreeningOne, ScreeningOneData } from './components/ScreeningOne';
import { ScreeningTwo, ScreeningTwoData } from './components/ScreeningTwo';
import { BookingCalendar } from './components/BookingCalendar';
import { Confirmation } from './components/Confirmation';
import { supabase } from '../lib/supabase';

type Step = 'screening-one' | 'screening-two' | 'booking' | 'confirmation';

interface AIAnalysis {
  alignment: string;
  score: number;
  recommendations: string[];
}

export function BookingFlow() {
  const [currentStep, setCurrentStep] = useState<Step>('screening-one');
  const [screeningOneData, setScreeningOneData] = useState<ScreeningOneData | null>(null);
  const [screeningTwoData, setScreeningTwoData] = useState<ScreeningTwoData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
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

  const generateAIAnalysis = (data: ScreeningOneData): AIAnalysis => {
    // Simulate AI analysis based on input. Services are now fully configurable,
    // so we generate a response from the selected service name rather than a
    // fixed set of keys.
    const serviceLabel = data.serviceName || 'the selected service';

    // Light heuristic: a more detailed description nudges the alignment score up.
    const detailBonus = Math.min(15, Math.floor((data.description?.length || 0) / 40));
    const score = Math.min(98, 80 + detailBonus);

    const alignment = `Based on your responses, ${serviceLabel} looks like a strong fit for what you described. We'll review your details and prepare for a focused, productive session together.`;

    const recommendations = [
      `Come prepared with your main goal for the ${serviceLabel.toLowerCase()}`,
      'Consider what a successful outcome would look like for you',
      "We'll tailor the session to your specific situation and next steps",
    ];

    return {
      alignment,
      score,
      recommendations,
    };
  };

  const handleScreeningOneComplete = async (data: ScreeningOneData) => {
    setScreeningOneData(data);

    // Generate AI analysis
    const analysis = generateAIAnalysis(data);
    setAiAnalysis(analysis);

    // Save to Supabase
    try {
      await supabase.from('screening_responses').insert({
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
      });
    } catch (error) {
      console.error('Error saving screening data:', error);
    }

    setCurrentStep('screening-two');
  };

  const handleScreeningTwoComplete = async (data: ScreeningTwoData) => {
    setScreeningTwoData(data);

    // Update Supabase
    if (screeningOneData) {
      try {
        await supabase
          .from('screening_responses')
          .update({
            screening_two_completed: true,
            status: 'booking',
          })
          .eq('email', screeningOneData.email);
      } catch (error) {
        console.error('Error updating screening data:', error);
      }
    }

    setCurrentStep('booking');
  };

  const handleBooking = async (date: Date, time: string) => {
    if (screeningOneData) {
      const details = {
        date,
        time,
        name: screeningOneData.name,
        email: screeningOneData.email,
      };
      setBookingDetails(details);

      // Update Supabase
      try {
        await supabase
          .from('screening_responses')
          .update({
            booking_date: date.toISOString(),
            booking_time: time,
            status: 'booked',
          })
          .eq('email', screeningOneData.email);
      } catch (error) {
        console.error('Error saving booking:', error);
      }

      setCurrentStep('confirmation');
    }
  };

  const handleStartOver = () => {
    setCurrentStep('screening-one');
    setScreeningOneData(null);
    setScreeningTwoData(null);
    setAiAnalysis(null);
    setBookingDetails(null);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
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
