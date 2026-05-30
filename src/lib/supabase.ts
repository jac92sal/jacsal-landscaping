import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Resolve connection from environment first so each deployment (and each
// customer install) can point at its OWN Supabase project via a .env file.
// Falls back to the bundled demo project values when no env is provided.
//
// Precedence:
//   1. VITE_SUPABASE_URL                (full URL)
//   2. VITE_SUPABASE_PROJECT_ID         (URL derived from project ref)
//   3. projectId from utils/supabase/info (demo fallback)
//
// The anon key is public-by-design (protected by RLS), so it is safe in the
// client bundle. The service_role key must NEVER appear here — it stays in
// Supabase Edge Function secrets (Deno.env) only.
const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = envUrl || `https://${envProjectId || projectId}.supabase.co`;
const supabaseAnonKey = envAnonKey || publicAnonKey;

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
