import { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export function AdminOverview() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    avgAlignmentScore: 0,
    inProgress: 0,
    recentBookings: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: bookings, error } = await supabase
        .from('screening_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = bookings?.length || 0;
      const confirmed = bookings?.filter((b) => b.status === 'booked').length || 0;
      const withScores = bookings?.filter((b) => b.alignment_score) || [];
      const avgScore =
        withScores.length > 0
          ? Math.round(withScores.reduce((sum, b) => sum + b.alignment_score, 0) / withScores.length)
          : 0;
      const inProg =
        bookings?.filter((b) => b.status === 'screening_one' || b.status === 'screening_two')
          .length || 0;

      setStats({
        totalBookings: total,
        confirmedBookings: confirmed,
        avgAlignmentScore: avgScore,
        inProgress: inProg,
        recentBookings: bookings?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
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
        <h2 className="mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome to your admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalBookings}</div>
          <div className="text-sm text-muted-foreground">Total Responses</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.confirmedBookings}</div>
          <div className="text-sm text-muted-foreground">Confirmed Bookings</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.avgAlignmentScore}%</div>
          <div className="text-sm text-muted-foreground">Avg AI Match Score</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Recent Activity</h3>
        {stats.recentBookings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No bookings yet. Start by sharing your booking form with potential clients.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{booking.name}</div>
                  <div className="text-sm text-muted-foreground">{booking.service_interest}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">{booking.status.replace('_', ' ')}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Quick Start Guide</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-mono">
              1
            </div>
            <div>
              <div className="font-medium">Configure API Keys</div>
              <p className="text-sm text-muted-foreground">
                Add your AI and email service API keys in the Secrets Vault
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-mono">
              2
            </div>
            <div>
              <div className="font-medium">Customize Services</div>
              <p className="text-sm text-muted-foreground">
                Add or edit the services you offer in the Services section
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-mono">
              3
            </div>
            <div>
              <div className="font-medium">Customize Questions</div>
              <p className="text-sm text-muted-foreground">
                Tailor the screening questions to match your specific needs
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-mono">
              4
            </div>
            <div>
              <div className="font-medium">Share Your Form</div>
              <p className="text-sm text-muted-foreground">
                Send clients to your booking URL to start collecting responses
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
