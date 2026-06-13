import { CheckCircle, Calendar, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { DocumentUpload } from './DocumentUpload';

interface ConfirmationProps {
  bookingDetails: {
    date: Date;
    time: string;
    name: string;
    email: string;
  };
  screeningId: string | null;
  requiresDocuments?: boolean;
  serviceName?: string;
  onStartOver: () => void;
}

export function Confirmation({
  bookingDetails,
  screeningId,
  requiresDocuments,
  serviceName,
  onStartOver,
}: ConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary/10 rounded-full">
        <CheckCircle className="w-10 h-10 text-secondary" />
      </div>

      <div>
        <h1 className="mb-3">Consultation Booked!</h1>
        <p className="text-muted-foreground">
          Thank you for completing the screening process. We're looking forward to speaking with you.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-6">
        <div>
          <h2 className="mb-6">Booking Details</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-background rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-mono">{format(bookingDetails.date, 'EEEE, MMMM d, yyyy')}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-background rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">Time</div>
                <div className="font-mono">{bookingDetails.time}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-background rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">Confirmation Sent To</div>
                <div>{bookingDetails.email}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="mb-3">What's Next?</h3>
          <ul className="text-left space-y-3 text-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-mono">1.</span>
              <span>You'll receive a confirmation email with calendar invite</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-mono">2.</span>
              <span>Our team will review your screening responses</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-mono">3.</span>
              <span>We'll prepare a customized consultation agenda</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-mono">4.</span>
              <span>Join the video call at the scheduled time</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Optional document sharing */}
      <DocumentUpload
        screeningId={screeningId}
        email={bookingDetails.email}
        requiresDocuments={requiresDocuments}
        serviceName={serviceName}
      />

      <div className="pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Need to make changes or have questions?
        </p>
        <button
          onClick={onStartOver}
          className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Start New Booking
        </button>
      </div>
    </div>
  );
}
