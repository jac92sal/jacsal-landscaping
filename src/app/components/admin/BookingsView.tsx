import { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Phone, User, Loader2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';

interface Booking {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  service_interest: string;
  budget_range: string;
  timeline: string;
  description: string;
  goals: string;
  challenges: string;
  ai_analysis: string;
  alignment_score: number;
  booking_date: string;
  booking_time: string;
  status: string;
}

export function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('screening_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.service_interest.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    screening_one: 'bg-yellow-100 text-yellow-800',
    screening_two: 'bg-blue-100 text-blue-800',
    booking: 'bg-purple-100 text-purple-800',
    booked: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Bookings</h2>
        <p className="text-muted-foreground">
          View and manage all consultation bookings and screening responses
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or service..."
            className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="screening_one">Screening One</option>
          <option value="screening_two">Screening Two</option>
          <option value="booking">Awaiting Booking</option>
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-primary">{bookings.length}</div>
          <div className="text-sm text-muted-foreground">Total Responses</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-secondary">
            {bookings.filter((b) => b.status === 'booked').length}
          </div>
          <div className="text-sm text-muted-foreground">Confirmed Bookings</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => b.alignment_score).length > 0
              ? Math.round(
                  bookings
                    .filter((b) => b.alignment_score)
                    .reduce((sum, b) => sum + b.alignment_score, 0) /
                    bookings.filter((b) => b.alignment_score).length
                )
              : 0}
            %
          </div>
          <div className="text-sm text-muted-foreground">Avg Alignment Score</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {bookings.filter((b) => b.status === 'screening_one' || b.status === 'screening_two').length}
          </div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No bookings found matching your criteria.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3>{booking.name}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            statusColors[booking.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {booking.email}
                        </div>
                        {booking.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {booking.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Service:</span>{' '}
                      <span className="font-medium">{booking.service_interest}</span>
                    </div>
                    {booking.budget_range && (
                      <div>
                        <span className="text-muted-foreground">Budget:</span>{' '}
                        <span className="font-medium">{booking.budget_range}</span>
                      </div>
                    )}
                    {booking.timeline && (
                      <div>
                        <span className="text-muted-foreground">Timeline:</span>{' '}
                        <span className="font-medium">{booking.timeline}</span>
                      </div>
                    )}
                    {booking.alignment_score && (
                      <div>
                        <span className="text-muted-foreground">AI Match:</span>{' '}
                        <span className="font-medium text-primary">{booking.alignment_score}%</span>
                      </div>
                    )}
                  </div>

                  {booking.description && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Description:</span>{' '}
                      <p className="mt-1">{booking.description}</p>
                    </div>
                  )}

                  {booking.booking_date && booking.booking_time && (
                    <div className="flex items-center gap-4 text-sm bg-secondary/10 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-secondary" />
                        <span className="font-mono">
                          {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-secondary" />
                        <span className="font-mono">{booking.booking_time}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground font-mono">
                  {format(new Date(booking.created_at), 'MMM d, h:mm a')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
