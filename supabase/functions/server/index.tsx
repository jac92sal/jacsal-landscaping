import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const PREFIX = "/make-server-e8cd329a";
const ANTHROPIC_MODEL_DEFAULT = "claude-sonnet-4-6";
const MAX_SCREENING_QUESTIONS = 5;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Resolve a configured secret: function env first, then the private
// secrets_vault table (service-role read, so RLS keeps it private from anon).
async function getSecret(keyName: string): Promise<string | null> {
  const envVal = Deno.env.get(keyName);
  if (envVal) return envVal;
  try {
    const { data, error } = await admin()
      .from("secrets_vault")
      .select("key_value, is_active")
      .eq("key_name", keyName)
      .maybeSingle();
    if (error) {
      console.error(`secrets_vault read failed for ${keyName}:`, error.message);
      return null;
    }
    if (!data || data.is_active === false) return null;
    return (data.key_value as string) ?? null;
  } catch (err) {
    console.error(`secrets_vault lookup error for ${keyName}:`, err);
    return null;
  }
}

function extractApiError(text: string): string {
  try {
    const j = JSON.parse(text);
    return j?.error?.message || j?.message || text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

// Call Anthropic with a system prompt (cached) + messages; return raw text.
async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  maxTokens = 1024,
): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic API error:", res.status, detail);
    return { ok: false, status: res.status, detail };
  }
  const payload = await res.json();
  return { ok: true, text: payload?.content?.[0]?.text ?? "" };
}

function parseJsonLoose(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

app.use("*", logger(console.log));
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

app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ── One-shot analysis (legacy; kept for the simple flow) ──────────────────
app.post(`${PREFIX}/analyze`, async (c) => {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 503);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const model = (await getSecret("ANTHROPIC_MODEL")) || ANTHROPIC_MODEL_DEFAULT;
  const system =
    "You are a client-screening analyst for a professional services firm. " +
    "Given a prospect's intake answers, assess how well their needs align with " +
    "the firm's services. Respond with ONLY a JSON object (no markdown, no prose) " +
    'of the exact shape: {"alignment": string, "score": number, "recommendations": string[]}. ' +
    "`alignment` is 2-3 sentences addressed to the prospect. `score` is an integer 0-100. " +
    "`recommendations` is 2-4 short next-step suggestions.";
  const user =
    "Prospect intake answers:\n" +
    `- Service interest: ${body.serviceInterest ?? "n/a"}\n` +
    `- Budget range: ${body.budgetRange ?? "n/a"}\n` +
    `- Timeline: ${body.timeline ?? "n/a"}\n` +
    `- Project description: ${body.description ?? "n/a"}`;

  const r = await callClaude(apiKey, model, system, [{ role: "user", content: user }]);
  if (!r.ok) return c.json({ error: "AI provider error" }, 502);
  try {
    const p = parseJsonLoose(r.text);
    return c.json({
      alignment: String(p.alignment ?? ""),
      score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
      recommendations: Array.isArray(p.recommendations) ? p.recommendations.map(String) : [],
    });
  } catch (err) {
    console.error("AI analysis parse failed:", err);
    return c.json({ error: "AI analysis failed" }, 500);
  }
});

// ── Branching screening agent ─────────────────────────────────────────────
// Stateless: the client sends contact + the full Q&A history each turn.
// Returns the next question, or (when enough is known) done=true + an internal
// fit assessment that is NOT shown to the client.
app.post(`${PREFIX}/screen`, async (c) => {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 503);

  let body: {
    contact?: Record<string, unknown>;
    history?: { question: string; answer: string }[];
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const contact = body.contact ?? {};
  const history = Array.isArray(body.history) ? body.history : [];
  const model = (await getSecret("ANTHROPIC_MODEL")) || ANTHROPIC_MODEL_DEFAULT;

  // Ground the agent in the services this business actually offers.
  let serviceList = "general professional services";
  try {
    const { data } = await admin()
      .from("services_config")
      .select("service_name, description")
      .eq("is_active", true)
      .order("sort_order");
    if (data && data.length) {
      serviceList = data.map((s: any) => `- ${s.service_name}: ${s.description ?? ""}`).join("\n");
    }
  } catch (_e) { /* fall back to generic */ }

  const mustFinish = history.length >= MAX_SCREENING_QUESTIONS;
  const system =
    "You are the intake screener for JacSal Services. Your job is to qualify a prospective " +
    "client through a short, adaptive interview — asking ONE concise question at a time, " +
    "choosing each question based on their previous answers, to judge whether they are a good fit.\n\n" +
    "Services offered:\n" + serviceList + "\n\n" +
    `Ask at most ${MAX_SCREENING_QUESTIONS} questions total. Keep questions friendly, specific, and ` +
    "non-redundant. When you have enough to assess fit (or the limit is reached), finish.\n\n" +
    "Respond with ONLY a JSON object, no markdown:\n" +
    '{"done": boolean, "question": string|null, "analysis": null | ' +
    '{"summary": string, "score": number, "fit": "strong"|"possible"|"weak", "recommendations": string[]}}\n' +
    "While interviewing: done=false, question=the next question, analysis=null.\n" +
    "When finished: done=true, question=null, analysis filled in. The analysis is INTERNAL " +
    "(for the business, not shown to the client): summary is 2-4 sentences, score is 0-100 fit, " +
    "recommendations are notes to the business about how to handle this lead.";

  const transcript = history.length
    ? history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n")
    : "(no questions asked yet)";
  const user =
    "Prospect contact / initial info:\n" +
    JSON.stringify(contact, null, 2) +
    "\n\nInterview so far:\n" + transcript +
    (mustFinish
      ? "\n\nYou have reached the question limit. Finish now: return done=true with the analysis."
      : "\n\nDecide the next question, or finish if you have enough.");

  const r = await callClaude(apiKey, model, system, [{ role: "user", content: user }], 1024);
  if (!r.ok) return c.json({ error: "AI provider error" }, 502);

  try {
    const p = parseJsonLoose(r.text);
    const done = !!p.done || mustFinish;
    if (done) {
      const a = p.analysis ?? {};
      return c.json({
        done: true,
        question: null,
        analysis: {
          summary: String(a.summary ?? ""),
          score: Math.max(0, Math.min(100, Math.round(Number(a.score) || 0))),
          fit: ["strong", "possible", "weak"].includes(a.fit) ? a.fit : "possible",
          recommendations: Array.isArray(a.recommendations) ? a.recommendations.map(String) : [],
        },
      });
    }
    return c.json({ done: false, question: String(p.question ?? "Tell us a bit more about your needs."), analysis: null });
  } catch (err) {
    console.error("screen parse failed:", err, r.text);
    return c.json({ error: "AI screening failed" }, 500);
  }
});

// ── Test a stored API key against its provider (admin Secrets Vault) ───────
app.post(`${PREFIX}/secrets/test`, async (c) => {
  let body: { key_name?: string };
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ ok: false, error: `Invalid JSON body: ${e}` }, 400);
  }
  const keyName = body.key_name;
  if (!keyName) return c.json({ ok: false, error: "Missing key_name" }, 400);

  const value = await getSecret(keyName);
  if (!value) return c.json({ ok: false, error: `Secret "${keyName}" not found or inactive` }, 404);

  try {
    if (keyName === "ANTHROPIC_API_KEY") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": value, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL_DEFAULT, max_tokens: 8, messages: [{ role: "user", content: "ping" }] }),
      });
      const text = await r.text();
      if (!r.ok) return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      return c.json({ ok: true, provider: "anthropic", message: "Key is valid" });
    }
    if (keyName === "OPENAI_API_KEY") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${value}` } });
      const text = await r.text();
      if (!r.ok) return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      return c.json({ ok: true, provider: "openai", message: "Key is valid" });
    }
    if (keyName === "RESEND_API_KEY") {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${value}` } });
      const text = await r.text();
      if (!r.ok) return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      return c.json({ ok: true, provider: "resend", message: "Key is valid" });
    }
    return c.json({ ok: false, error: `No automated test for "${keyName}". Supported: ANTHROPIC_API_KEY, OPENAI_API_KEY, RESEND_API_KEY.` }, 200);
  } catch (e) {
    return c.json({ ok: false, error: `Network error while testing ${keyName}: ${e}` }, 200);
  }
});

// ── Confirm a request + email the client (admin) ──────────────────────────
app.post(`${PREFIX}/confirm`, async (c) => {
  let body: { id?: string; date?: string; time?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Invalid JSON body" }, 400);
  }
  const { id, date, time } = body;
  if (!id || !date || !time) {
    return c.json({ ok: false, error: "id, date and time are required" }, 400);
  }

  const sb = admin();
  const { data: row, error: updErr } = await sb
    .from("screening_responses")
    .update({ booking_date: `${date}T12:00:00Z`, booking_time: time, status: "confirmed" })
    .eq("id", id)
    .select("name, email")
    .single();
  if (updErr || !row) {
    return c.json({ ok: false, error: updErr?.message ?? "Request not found" }, 404);
  }

  const resendKey = await getSecret("RESEND_API_KEY");
  if (!resendKey) {
    return c.json({ ok: true, emailed: false, error: "Confirmed, but RESEND_API_KEY is not configured" });
  }
  const from = (await getSecret("MAIL_FROM")) || "JacSal Services <onboarding@resend.dev>";
  const niceDate = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const firstName = String(row.name ?? "there").split(" ")[0];
  const html =
    `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">` +
    `<h2 style="color:#2563eb">Your consultation is confirmed</h2>` +
    `<p>Hi ${firstName},</p>` +
    `<p>Great news — we've confirmed your consultation with JacSal Services for:</p>` +
    `<p style="font-size:18px;font-weight:600">${niceDate} at ${time}</p>` +
    `<p>We're looking forward to speaking with you. If you need to make a change, just reply to this email.</p>` +
    `<p style="color:#64748b;font-size:13px;margin-top:24px">JacSal Services — Supporting Dreams</p>` +
    `</div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: row.email,
        subject: "Your JacSal Services consultation is confirmed",
        html,
      }),
    });
    const text = await r.text();
    if (!r.ok) {
      console.error("Resend error:", r.status, text);
      return c.json({ ok: true, emailed: false, error: extractApiError(text) });
    }
    return c.json({ ok: true, emailed: true });
  } catch (e) {
    return c.json({ ok: true, emailed: false, error: `Email send failed: ${e}` });
  }
});

Deno.serve(app.fetch);
