import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addMonths, subMonths } from 'date-fns';

interface BookingCalendarProps {
  onBook: (date: Date, time: string) => void;
}

const timeSlots = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
];

export function BookingCalendar({ onBook }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth();
  const today = new Date();

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleBook = () => {
    if (selectedDate && selectedTime) {
      onBook(selectedDate, selectedTime);
    }
  };

  const isDateAvailable = (date: Date) => {
    return date >= today;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div>
        <h2 className="mb-2">Schedule Your Consultation</h2>
        <p className="text-muted-foreground mb-6">
          Select a date and time that works best for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm text-muted-foreground font-mono">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} />;
              }

              const available = isDateAvailable(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);

              return (
                <button
                  key={index}
                  onClick={() => available && handleDateSelect(day)}
                  disabled={!available}
                  className={`
                    aspect-square p-2 rounded-lg text-sm font-mono transition-all
                    ${
                      selected
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                        : available
                        ? 'hover:bg-muted'
                        : 'text-muted-foreground/40 cursor-not-allowed'
                    }
                    ${isToday && !selected ? 'ring-1 ring-border' : ''}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots & Booking */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3>Available Times</h3>
            </div>

            {selectedDate ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3 font-mono">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`
                      w-full px-4 py-3 rounded-lg text-left transition-all font-mono
                      ${
                        selectedTime === time
                          ? 'bg-secondary text-secondary-foreground ring-2 ring-secondary/20'
                          : 'bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a date to view available times</p>
              </div>
            )}
          </div>

          {selectedDate && selectedTime && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h4 className="mb-3">Booking Summary</h4>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-mono">{format(selectedDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-mono">60 minutes</span>
                </div>
              </div>
              <button
                onClick={handleBook}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Confirm Booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
