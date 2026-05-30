import { supabaseAnonKey, supabaseUrl } from './supabase';
import type { ScreeningOneData } from '../app/components/ScreeningOne';

export interface AIAnalysis {
  alignment: string;
  score: number;
  recommendations: string[];
}

// The deployed Claude-powered Edge Functions. Override with env vars for a
// different deployment.
const DEFAULT_ANALYSIS_URL = `${supabaseUrl}/functions/v1/make-server-e8cd329a/analyze`;
const DEFAULT_SCREEN_URL = `${supabaseUrl}/functions/v1/make-server-e8cd329a/screen`;

export interface ScreenAnalysis {
  summary: string;
  score: number;
  fit: 'strong' | 'possible' | 'weak';
  recommendations: string[];
}

export interface ScreenTurn {
  done: boolean;
  question: string | null;
  analysis: ScreenAnalysis | null;
}

export interface QA {
  question: string;
  answer: string;
}

/**
 * One turn of the branching screening agent. Sends the prospect's contact info
 * plus the Q&A history so far; gets back the next question, or done=true with
 * an internal fit assessment. Stateless — the caller accumulates `history`.
 */
export async function screenStep(
  contact: Record<string, unknown>,
  history: QA[],
): Promise<ScreenTurn> {
  const url = (import.meta.env.VITE_AI_SCREEN_URL as string | undefined) || DEFAULT_SCREEN_URL;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ contact, history }),
  });
  if (!res.ok) throw new Error(`screen request failed: ${res.status}`);
  const json = (await res.json()) as ScreenTurn;
  return json;
}

/**
 * Deterministic, rule-based analysis. Used as a graceful fallback whenever the
 * Claude-powered Edge Function is unavailable, so a screening submission never
 * dead-ends.
 */
export function ruleBasedAnalysis(data: ScreeningOneData): AIAnalysis {
  const serviceScores: Record<string, number> = {
    consulting: 85,
    design: 90,
    development: 88,
    marketing: 82,
    other: 75,
  };

  const score = serviceScores[data.serviceInterest] ?? 80;

  const alignmentTexts: Record<string, string> = {
    consulting:
      'Your project aligns well with our strategic consulting services. We have extensive experience helping clients navigate complex business challenges.',
    design:
      "Excellent match! Your creative needs align perfectly with our design team's expertise in creating compelling visual experiences.",
    development:
      'Great fit! Your technical requirements match our engineering capabilities. We can help bring your vision to life.',
    marketing:
      'Strong alignment with our marketing services. We can help you reach and engage your target audience effectively.',
    other:
      "We can certainly help! Based on your description, we'll connect you with the right specialist from our team.",
  };

  const recommendations = [
    `We recommend a comprehensive ${data.serviceInterest || 'tailored'} approach`,
    'Consider starting with a discovery phase to align expectations',
    'Our team will prepare customized materials for your consultation',
  ];

  return {
    alignment: alignmentTexts[data.serviceInterest] || alignmentTexts.other,
    score,
    recommendations,
  };
}

/**
 * Resolve the AI screening analysis.
 *
 * Sends the client's answers to the Claude-powered Edge Function (the Anthropic
 * key stays server-side). If the call fails for any reason — no key configured,
 * network error, malformed response — it falls back to deterministic
 * rule-based scoring so the flow always continues.
 */
export async function analyzeScreening(data: ScreeningOneData): Promise<AIAnalysis> {
  const url =
    (import.meta.env.VITE_AI_ANALYSIS_URL as string | undefined) || DEFAULT_ANALYSIS_URL;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`AI analysis request failed: ${res.status}`);
    }

    const json = (await res.json()) as Partial<AIAnalysis>;

    if (
      typeof json.alignment !== 'string' ||
      typeof json.score !== 'number' ||
      !Array.isArray(json.recommendations)
    ) {
      throw new Error('AI analysis returned an unexpected shape');
    }

    return {
      alignment: json.alignment,
      score: Math.max(0, Math.min(100, Math.round(json.score))),
      recommendations: json.recommendations.map(String),
    };
  } catch (err) {
    console.warn('[screening] Falling back to rule-based analysis:', err);
    return ruleBasedAnalysis(data);
  }
}
