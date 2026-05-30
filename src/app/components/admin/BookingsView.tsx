import { useState, useEffect } from 'react';
import {
  Calendar, Clock, Mail, Phone, Loader2, Search, CheckCircle2, XCircle,
  Sparkles, MessageSquare, CalendarClock,
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../../lib/supabase';
import { format } from 'date-fns';

interface RequestedTime { date: string; time: string }
interface QA { question: string; answer: string }
interface Analysis { summary?: string; score?: number; fit?: string; recommendations?: string[] }

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
  ai_analysis: string;
  alignment_score: number;
  booking_date: string;
  booking_time: string;
  status: string;
  requested_times: RequestedTime[] | null;
  conversation: { history?: QA[]; analysis?: Analysis } | null;
}

const CONFIRM_URL = `${supabaseUrl}/functions/v1/make-server-e8cd329a/confirm`;

function formatSlot(slot: RequestedTime): string {
  const [y, m, d] = slot.date.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return `${dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${slot.time}`;
}

export function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

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

  const confirmRequest = async (id: string, slot: RequestedTime) => {
    setConfirmingId(id);
    setResults((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    try {
      const res = await fetch(CONFIRM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ id, date: slot.date, time: slot.time }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults((p) => ({
          ...p,
          [id]: {
            ok: true,
            msg: data.emailed
              ? 'Confirmed — the client has been emailed.'
              : `Confirmed, but email not sent: ${data.error ?? 'no email configured'}`,
          },
        }));
        await loadBookings();
      } else {
        setResults((p) => ({ ...p, [id]: { ok: false, msg: data.error ?? 'Confirm failed' } }));
      }
    } catch (e) {
      setResults((p) => ({ ...p, [id]: { ok: false, msg: `Error: ${e}` } }));
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.service_interest ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    requested: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-rose-100 text-rose-800',
    booked: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-slate-100 text-slate-800',
    screening_one: 'bg-yellow-100 text-yellow-800',
    screening_two: 'bg-blue-100 text-blue-800',
    booking: 'bg-purple-100 text-purple-800',
  };

  const fitColors: Record<string, string> = {
    strong: 'bg-emerald-100 text-emerald-800',
    possible: 'bg-amber-100 text-amber-800',
    weak: 'bg-rose-100 text-rose-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = bookings.filter((b) => b.status === 'requested').length;
  const confirmed = bookings.filter((b) => b.status === 'confirmed' || b.status === 'booked').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Consultation Requests</h2>
        <p className="text-muted-foreground">
          Review requests, see the AI screening, and confirm one of the client's proposed times.
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
          <option value="requested">Requested</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-primary">{bookings.length}</div>
          <div className="text-sm text-muted-foreground">Total Requests</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-500">{pending}</div>
          <div className="text-sm text-muted-foreground">Awaiting Confirmation</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-secondary">{confirmed}</div>
          <div className="text-sm text-muted-foreground">Confirmed</div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No requests found matching your criteria.</p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const analysis = b.conversation?.analysis;
            const history = b.conversation?.history ?? [];
            const result = results[b.id];
            return (
              <div key={b.id} className="bg-card border border-border rounded-lg p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3>{b.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[b.status] || 'bg-slate-100 text-slate-800'}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{b.email}</span>
                      {b.phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{b.phone}</span>}
                      {b.service_interest && <span>Service: <span className="text-foreground">{b.service_interest}</span></span>}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                    {format(new Date(b.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>

                {b.description && (
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                )}

                {/* Internal AI analysis */}
                {analysis && (analysis.summary || (analysis.recommendations?.length ?? 0) > 0) && (
                  <div className="bg-muted/40 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">AI fit assessment (internal)</span>
                      {analysis.fit && (
                        <span className={`text-xs px-2 py-0.5 rounded ${fitColors[analysis.fit] || 'bg-slate-100 text-slate-800'}`}>
                          {analysis.fit}
                        </span>
                      )}
                      {typeof analysis.score === 'number' && (
                        <span className="text-xs font-mono text-primary">{analysis.score}%</span>
                      )}
                    </div>
                    {analysis.summary && <p className="text-sm mb-2">{analysis.summary}</p>}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
                        {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {/* Q&A transcript */}
                {history.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" /> Screening answers ({history.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {history.map((qa, i) => (
                        <div key={i} className="border-l-2 border-border pl-3">
                          <div className="text-muted-foreground">{qa.question}</div>
                          <div>{qa.answer}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Confirmed time */}
                {(b.status === 'confirmed' || b.status === 'booked') && b.booking_date && b.booking_time && (
                  <div className="flex items-center gap-4 text-sm bg-secondary/10 p-3 rounded-lg">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-secondary" /><span className="font-mono">{format(new Date(b.booking_date), 'MMM d, yyyy')}</span></span>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-secondary" /><span className="font-mono">{b.booking_time}</span></span>
                    <span className="text-secondary">Confirmed</span>
                  </div>
                )}

                {/* Requested times + confirm */}
                {b.status === 'requested' && b.requested_times && b.requested_times.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                      <CalendarClock className="w-4 h-4 text-primary" /> Proposed times — pick one to confirm
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {b.requested_times.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => confirmRequest(b.id, slot)}
                          disabled={confirmingId === b.id}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                        >
                          {confirmingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Confirm {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {result && (
                  <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${result.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    {result.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <span>{result.msg}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
