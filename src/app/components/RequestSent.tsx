import { CheckCircle, CalendarClock, Mail } from 'lucide-react';
import { RequestedTime } from './RequestTimes';

interface RequestSentProps {
  email: string;
  requestedTimes: RequestedTime[];
  onStartOver: () => void;
}

function formatSlot(slot: RequestedTime): string {
  // slot.date is yyyy-mm-dd; render without timezone surprises.
  const [y, m, d] = slot.date.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const date = dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${date} · ${slot.time}`;
}

export function RequestSent({ email, requestedTimes, onStartOver }: RequestSentProps) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary/10 rounded-full">
        <CheckCircle className="w-10 h-10 text-secondary" />
      </div>

      <div>
        <h1 className="mb-3">Request Received</h1>
        <p className="text-muted-foreground">
          Thanks! We've got your consultation request and your answers. We'll review everything and
          confirm one of your preferred times by email shortly.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-6 text-left">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h3>Your preferred times</h3>
          </div>
          <ul className="space-y-2">
            {requestedTimes.map((slot, i) => (
              <li key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg font-mono text-sm">
                <span className="text-primary">{i + 1}.</span>
                {formatSlot(slot)}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            These are <span className="text-foreground">requested</span>, not yet confirmed — we'll
            lock in whichever works best.
          </p>
        </div>

        <div className="pt-4 border-t border-border flex items-center gap-3">
          <div className="p-2 bg-background rounded-lg">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Confirmation will be sent to</div>
            <div>{email}</div>
          </div>
        </div>
      </div>

      <button
        onClick={onStartOver}
        className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        Start a New Request
      </button>
    </div>
  );
}
