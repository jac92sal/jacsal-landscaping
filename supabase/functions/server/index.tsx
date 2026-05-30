import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const PREFIX = "/make-server-e8cd329a";
const ANTHROPIC_MODEL_DEFAULT = "claude-sonnet-4-6";
const MIN_SCREENING_QUESTIONS = 3;
const MAX_SCREENING_QUESTIONS = 5;
const LOGO_URL = "https://pub-5ee58de477af49c38679ff160a4fd9e4.r2.dev/logo200x200.png";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

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
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

app.post(`${PREFIX}/analyze`, async (c) => {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 503);
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const model = (await getSecret("ANTHROPIC_MODEL")) || ANTHROPIC_MODEL_DEFAULT;
  const system = [
    "You are a client-screening analyst for a professional services firm.",
    "Given a prospect's intake answers, assess how well their needs align with the firm's services.",
    "Respond with ONLY a JSON object (no markdown) with keys: alignment (string, 2-3 sentences to the prospect), score (number 0-100), recommendations (array of 2-4 short next steps).",
  ].join(" ");
  const user = [
    "Prospect intake answers:",
    `- Service interest: ${body.serviceInterest ?? "n/a"}`,
    `- Budget range: ${body.budgetRange ?? "n/a"}`,
    `- Timeline: ${body.timeline ?? "n/a"}`,
    `- Project description: ${body.description ?? "n/a"}`,
  ].join("\n");
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

app.post(`${PREFIX}/screen`, async (c) => {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 503);
  let body: { contact?: Record<string, unknown>; history?: { question: string; answer: string }[] };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const contact = body.contact ?? {};
  const history = Array.isArray(body.history) ? body.history : [];
  const model = (await getSecret("ANTHROPIC_MODEL")) || ANTHROPIC_MODEL_DEFAULT;

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
  } catch (_e) { /* generic */ }

  const canFinish = history.length >= MIN_SCREENING_QUESTIONS;
  const mustFinish = history.length >= MAX_SCREENING_QUESTIONS;
  const system = [
    "You are the intake screener for JacSal Services. Qualify a prospective client through a short, adaptive interview: ask ONE concise question at a time, choosing each based on prior answers, to judge whether they are a good fit.",
    "",
    "Services offered:",
    serviceList,
    "",
    `Ask between ${MIN_SCREENING_QUESTIONS} and ${MAX_SCREENING_QUESTIONS} questions. Do NOT finish before asking at least ${MIN_SCREENING_QUESTIONS}.`,
    "Across the questions, try to cover: (1) what they actually need and the scope, (2) their budget expectations, (3) timeline or urgency, and (4) their current situation or who decides — but adapt naturally to what they say. Keep each question friendly, specific, and non-redundant.",
    "",
    "Respond with ONLY a JSON object, no markdown, using exactly these keys:",
    "done (boolean), question (string or null), analysis (null, or an object with: summary string, score number 0-100, fit one of strong/possible/weak, recommendations array of strings).",
    "While interviewing: done=false, question=the next question, analysis=null.",
    "When finished: done=true, question=null, analysis filled. The analysis is INTERNAL (for the business, not the client): summary 2-4 sentences, score 0-100 fit, recommendations are notes to the business on how to handle this lead.",
  ].join("\n");

  const transcript = history.length
    ? history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n")
    : "(no questions asked yet)";
  const user = [
    "Prospect contact / initial info:",
    JSON.stringify(contact, null, 2),
    "",
    "Interview so far:",
    transcript,
    "",
    mustFinish
      ? "You have reached the question limit. Finish now: return done=true with the analysis."
      : canFinish
        ? "Decide the next question, or finish if you genuinely have enough."
        : `You must ask at least ${MIN_SCREENING_QUESTIONS} questions before finishing. Ask the next question now (done=false).`,
  ].join("\n");

  const r = await callClaude(apiKey, model, system, [{ role: "user", content: user }], 1024);
  if (!r.ok) return c.json({ error: "AI provider error" }, 502);
  try {
    const p = parseJsonLoose(r.text);
    const done = mustFinish || (!!p.done && canFinish);
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
    const fallbackQ = history.length === 0
      ? "To start: what are you hoping to accomplish, and what's prompting you to reach out now?"
      : "Could you share a bit more detail about that?";
    return c.json({ done: false, question: String(p.question || fallbackQ), analysis: null });
  } catch (err) {
    console.error("screen parse failed:", err, r.text);
    return c.json({ error: "AI screening failed" }, 500);
  }
});

app.post(`${PREFIX}/secrets/test`, async (c) => {
  let body: { key_name?: string };
  try { body = await c.req.json(); } catch (e) { return c.json({ ok: false, error: `Invalid JSON body: ${e}` }, 400); }
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
    if (keyName === "RESEND_API_KEY") {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${value}` } });
      const text = await r.text();
      if (!r.ok) return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      return c.json({ ok: true, provider: "resend", message: "Key is valid" });
    }
    if (keyName === "OPENAI_API_KEY") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${value}` } });
      const text = await r.text();
      if (!r.ok) return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      return c.json({ ok: true, provider: "openai", message: "Key is valid" });
    }
    return c.json({ ok: false, error: `No automated test for "${keyName}".` }, 200);
  } catch (e) {
    return c.json({ ok: false, error: `Network error while testing ${keyName}: ${e}` }, 200);
  }
});

// Brand-styled confirmation email (HTML) + plain-text fallback.
function confirmationEmail(firstName: string, niceDate: string, time: string): { html: string; text: string } {
  const html =
    `<div style='background:#0a0e1a;padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif'>` +
      `<div style='max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0'>` +
        `<div style='background:#ffffff;padding:28px;text-align:center;border-bottom:1px solid #e2e8f0'>` +
          `<div style='display:inline-block;width:104px;height:104px;border-radius:50%;background:#0b1220'>` +
            `<img src='${LOGO_URL}' alt='JacSal Services' width='64' height='64' style='margin-top:20px' />` +
          `</div>` +
        `</div>` +
        `<div style='padding:32px;color:#0f172a'>` +
          `<div style='display:inline-block;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:14px'>CONFIRMED</div>` +
          `<h1 style='font-size:22px;margin:0 0 14px;color:#0f172a'>Your consultation is confirmed</h1>` +
          `<p style='margin:0 0 14px;line-height:1.6'>Hi ${firstName},</p>` +
          `<p style='margin:0 0 18px;line-height:1.6'>Great news &mdash; we&rsquo;ve locked in your consultation with JacSal Services:</p>` +
          `<div style='background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:10px;padding:18px;margin:0 0 20px'>` +
            `<div style='font-size:18px;font-weight:700;color:#0f172a'>${niceDate}</div>` +
            `<div style='font-size:16px;color:#0891b2;font-weight:600;margin-top:4px'>${time}</div>` +
          `</div>` +
          `<p style='margin:0 0 8px;line-height:1.6'>We&rsquo;re looking forward to speaking with you. Need to make a change? Just reply to this email.</p>` +
          `<p style='margin:24px 0 0;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:16px'>JacSal Services &middot; Supporting Dreams</p>` +
        `</div>` +
      `</div>` +
    `</div>`;
  const text = [
    "Your consultation is confirmed",
    "",
    `Hi ${firstName},`,
    "",
    "Great news - we've locked in your consultation with JacSal Services:",
    "",
    `  ${niceDate} at ${time}`,
    "",
    "We're looking forward to speaking with you. Need to make a change? Just reply to this email.",
    "",
    "-- JacSal Services | Supporting Dreams",
  ].join("\n");
  return { html, text };
}

app.post(`${PREFIX}/confirm`, async (c) => {
  let body: { id?: string; date?: string; time?: string };
  try { body = await c.req.json(); } catch { return c.json({ ok: false, error: "Invalid JSON body" }, 400); }
  const { id, date, time } = body;
  if (!id || !date || !time) return c.json({ ok: false, error: "id, date and time are required" }, 400);
  const sb = admin();
  const { data: row, error: updErr } = await sb
    .from("screening_responses")
    .update({ booking_date: `${date}T12:00:00Z`, booking_time: time, status: "confirmed" })
    .eq("id", id)
    .select("name, email")
    .single();
  if (updErr || !row) return c.json({ ok: false, error: updErr?.message ?? "Request not found" }, 404);
  const resendKey = await getSecret("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: true, emailed: false, error: "Confirmed, but RESEND_API_KEY is not configured" });
  const from = (await getSecret("MAIL_FROM")) || "JacSal Services <hello@jacsalservices.com>";
  const niceDate = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const firstName = String(row.name ?? "there").split(" ")[0];
  const { html, text } = confirmationEmail(firstName, niceDate, time);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: row.email, subject: "Your JacSal Services consultation is confirmed", html, text }),
    });
    const t = await r.text();
    if (!r.ok) { console.error("Resend error:", r.status, t); return c.json({ ok: true, emailed: false, error: extractApiError(t) }); }
    return c.json({ ok: true, emailed: true });
  } catch (e) {
    return c.json({ ok: true, emailed: false, error: `Email send failed: ${e}` });
  }
});

Deno.serve(app.fetch);
