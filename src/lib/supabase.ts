import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ScreeningResponse = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  service_interest: string;
  budget_range: string;
  timeline: string;
  description: string;
  screening_one_completed: boolean;
  screening_two_completed: boolean;
  ai_analysis: string | null;
  alignment_score: number | null;
  booking_date: string | null;
  booking_time: string | null;
  status: 'screening_one' | 'screening_two' | 'booked' | 'completed';
};
