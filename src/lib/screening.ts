import { supabaseAnonKey } from './supabase';
import type { ScreeningOneData } from '../app/components/ScreeningOne';

export interface AIAnalysis {
  alignment: string;
  score: number;
  recommendations: string[];
}

/**
 * Deterministic, rule-based analysis. Used as the default and as a graceful
 * fallback whenever the Claude-powered Edge Function is unavailable, so the
 * app never dead-ends on a screening submission.
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
 * If VITE_AI_ANALYSIS_URL points at the deployed Supabase Edge Function, the
 * client's answers are sent there for a genuine Claude-powered assessment
 * (the Anthropic key stays server-side). If the var is unset or the call
 * fails for any reason, we fall back to deterministic rule-based scoring.
 */
export async function analyzeScreening(data: ScreeningOneData): Promise<AIAnalysis> {
  const url = import.meta.env.VITE_AI_ANALYSIS_URL as string | undefined;

  if (!url) {
    return ruleBasedAnalysis(data);
  }

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

    // Validate the shape before trusting it; fall back if malformed.
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
