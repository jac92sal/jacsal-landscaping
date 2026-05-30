import { useState } from 'react';
import { Clock, CalendarDays } from 'lucide-react';

export interface RequestedTime {
  date: string; // ISO yyyy-mm-dd
  time: string;
}

interface RequestTimesProps {
  onComplete: (times: RequestedTime[]) => void;
}

const TIME_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
];

const todayISO = () => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export function RequestTimes({ onComplete }: RequestTimesProps) {
  const [slots, setSlots] = useState<RequestedTime[]>([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ]);

  const min = todayISO();

  const update = (i: number, patch: Partial<RequestedTime>) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const filled = slots.filter((s) => s.date && s.time);
  const canContinue = filled.length >= 1;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="mb-2">Propose Your Preferred Times</h2>
        <p className="text-muted-foreground">
          We don't know your schedule yet, so please give us up to{' '}
          <span className="text-foreground">three times that work for you</span>. We'll review your
          request and confirm one by email.
        </p>
      </div>

      <div className="space-y-4">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground sm:w-24">
              <CalendarDays className="w-4 h-4 text-primary" />
              Option {i + 1}
            </div>
            <input
              type="date"
              min={min}
              value={slot.date}
              onChange={(e) => update(i, { date: e.target.value })}
              className="flex-1 px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
            />
            <div className="relative flex-1">
              <Clock className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={slot.time}
                onChange={(e) => update(i, { time: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm appearance-none"
              >
                <option value="">Select a time…</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onComplete(filled)}
        disabled={!canContinue}
        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
      {!canContinue && (
        <p className="text-sm text-muted-foreground text-center">
          Add at least one preferred time to continue.
        </p>
      )}
    </div>
  );
}
