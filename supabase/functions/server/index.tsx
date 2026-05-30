import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-e8cd329a/health", (c) => {
  return c.json({ status: "ok" });
});

// ──────────────────────────────────────────────────────────────────────────
// AI screening analysis (Claude-powered)
//
// Receives the client's Screening One answers and returns a genuine alignment
// assessment. The Anthropic API key is read from the function's environment
// (set via `supabase secrets set ANTHROPIC_API_KEY=...`) and never leaves the
// server. The client calls this via VITE_AI_ANALYSIS_URL; if the key is
// missing or the call fails, the client falls back to rule-based scoring.
// ──────────────────────────────────────────────────────────────────────────
app.post("/make-server-e8cd329a/analyze", async (c) => {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-sonnet-latest";

  const systemPrompt =
    "You are a client-screening analyst for a professional services firm. " +
    "Given a prospect's intake answers, assess how well their needs align with " +
    "the firm's services. Respond with ONLY a JSON object (no markdown, no prose) " +
    'of the exact shape: {"alignment": string, "score": number, "recommendations": string[]}. ' +
    "`alignment` is 2-3 sentences addressed to the prospect. `score` is an integer 0-100 " +
    "representing fit. `recommendations` is 2-4 short, concrete next-step suggestions.";

  const userContent =
    "Prospect intake answers:\n" +
    `- Service interest: ${body.serviceInterest ?? "n/a"}\n` +
    `- Budget range: ${body.budgetRange ?? "n/a"}\n` +
    `- Timeline: ${body.timeline ?? "n/a"}\n` +
    `- Project description: ${body.description ?? "n/a"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic API error:", res.status, detail);
      return c.json({ error: "AI provider error" }, 502);
    }

    const payload = await res.json();
    const text: string = payload?.content?.[0]?.text ?? "";

    // The model may occasionally wrap JSON in a code fence; strip it.
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return c.json({
      alignment: String(parsed.alignment ?? ""),
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String)
        : [],
    });
  } catch (err) {
    console.error("AI analysis failed:", err);
    return c.json({ error: "AI analysis failed" }, 500);
  }
});

Deno.serve(app.fetch);