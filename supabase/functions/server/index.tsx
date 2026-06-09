import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
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

app.get("/make-server-e8cd329a/health", (c) => {
  return c.json({ status: "ok" });
});

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function loadSecret(keyName: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("secrets_vault")
    .select("key_value, is_active")
    .eq("key_name", keyName)
    .maybeSingle();
  if (error) {
    console.log(`Error loading secret ${keyName} from vault: ${error.message}`);
    return null;
  }
  if (!data || data.is_active === false) return null;
  return data.key_value as string;
}

app.post("/make-server-e8cd329a/secrets/test", async (c) => {
  let body: { key_name?: string };
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ ok: false, error: `Invalid JSON body while testing secret: ${e}` }, 400);
  }
  const keyName = body.key_name;
  if (!keyName) return c.json({ ok: false, error: "Missing key_name in request body" }, 400);

  const value = await loadSecret(keyName);
  if (!value) return c.json({ ok: false, error: `Secret "${keyName}" not found or inactive in vault` }, 404);

  try {
    if (keyName === "ANTHROPIC_API_KEY") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": value,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const text = await r.text();
      if (!r.ok) {
        console.log(`Anthropic key test failed (${r.status}): ${text}`);
        return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      }
      return c.json({ ok: true, provider: "anthropic", message: "Key is valid" });
    }

    if (keyName === "OPENAI_API_KEY") {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${value}` },
      });
      const text = await r.text();
      if (!r.ok) {
        console.log(`OpenAI key test failed (${r.status}): ${text}`);
        return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      }
      return c.json({ ok: true, provider: "openai", message: "Key is valid" });
    }

    if (keyName === "RESEND_API_KEY") {
      const r = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${value}` },
      });
      const text = await r.text();
      if (!r.ok) {
        console.log(`Resend key test failed (${r.status}): ${text}`);
        return c.json({ ok: false, status: r.status, error: extractApiError(text) }, 200);
      }
      return c.json({ ok: true, provider: "resend", message: "Key is valid" });
    }

    return c.json({
      ok: false,
      error: `No automated test available for "${keyName}". Supported: ANTHROPIC_API_KEY, OPENAI_API_KEY, RESEND_API_KEY.`,
    }, 200);
  } catch (e) {
    console.log(`Network error while testing ${keyName}: ${e}`);
    return c.json({ ok: false, error: `Network error while testing ${keyName}: ${e}` }, 200);
  }
});

function extractApiError(text: string): string {
  try {
    const j = JSON.parse(text);
    return j?.error?.message || j?.message || text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

Deno.serve(app.fetch);
