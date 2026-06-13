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

// ---- Services (KV-backed) ----------------------------------------------
// Services are stored in the KV store under the `service:<id>` prefix so we
// don't need any SQL/DDL. Each value is the full service object.

interface ServiceRecord {
  id: string;
  service_name: string;
  service_value: string;
  description: string;
  duration_minutes: number;
  price: number; // in dollars; 0 when is_free
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
}

const SEED_SERVICES: Omit<ServiceRecord, "id">[] = [
  {
    service_name: "Free Discovery Call",
    service_value: "discovery-call",
    description:
      "The Discovery Call helps determine whether the client is a good fit for Milah Grace Co. services and which offer makes the most sense. This is not a free strategy session.",
    duration_minutes: 15,
    price: 0,
    is_free: true,
    is_active: true,
    sort_order: 1,
  },
  {
    service_name: "Advisory Call",
    service_value: "advisory-call",
    description:
      "The Advisory Call is for clients who need quick, focused guidance on one business or career question. This call is simple, direct, and limited in scope.",
    duration_minutes: 25,
    price: 25,
    is_free: false,
    is_active: true,
    sort_order: 2,
  },
  {
    service_name: "Strategic Follow-Up Session",
    service_value: "strategic-follow-up",
    description: "Add-on support session.",
    duration_minutes: 30,
    price: 125,
    is_free: false,
    is_active: true,
    sort_order: 3,
  },
  {
    service_name: "Spiritual Business Alignment Session",
    service_value: "spiritual-business-alignment",
    description:
      "The Spiritual Business Alignment Session helps clients reflect on whether their business direction, offer, or next step feels aligned with their values, purpose, capacity, and ethical grounding. This is not a full business strategy session.",
    duration_minutes: 20,
    price: 77.77,
    is_free: false,
    is_active: true,
    sort_order: 4,
  },
  {
    service_name: "Career Coaching Package",
    service_value: "career-coaching-package",
    description:
      "Strategic career clarity and positioning support for professionals seeking direction, alignment, or career transition guidance. This service includes personalized strategy sessions focused on strengths, career alignment, positioning, and next steps.",
    duration_minutes: 60,
    price: 175,
    is_free: false,
    is_active: true,
    sort_order: 5,
  },
  {
    service_name: "30-Day Business Foundations & Launch Intensive",
    service_value: "business-foundations-intensive",
    description:
      "The 30-Day Business Foundations & Launch Intensive helps early-stage or restructuring entrepreneurs build the foundational clarity, offer structure, messaging, systems, and launch readiness needed to move forward with confidence.",
    duration_minutes: 60,
    price: 3000,
    is_free: false,
    is_active: true,
    sort_order: 6,
  },
  {
    service_name: "Business Clarity & Readiness Assessment",
    service_value: "business-clarity-assessment",
    description:
      "The Business Clarity & Readiness Assessment helps clients understand where their business currently stands and what needs to be strengthened before they launch, scale, or invest in bigger support. This offer is designed to diagnose gaps and provide clear direction.",
    duration_minutes: 60,
    price: 225,
    is_free: false,
    is_active: true,
    sort_order: 7,
  },
];

async function listServices(): Promise<ServiceRecord[]> {
  const values = (await kv.getByPrefix("service:")) as ServiceRecord[];
  return (values || []).sort((a, b) => a.sort_order - b.sort_order);
}

app.get("/make-server-e8cd329a/services", async (c) => {
  try {
    const services = await listServices();
    return c.json({ ok: true, services });
  } catch (e) {
    console.log(`Error listing services: ${e}`);
    return c.json({ ok: false, error: `Error listing services: ${e}`, services: [] }, 500);
  }
});

app.post("/make-server-e8cd329a/services/seed", async (c) => {
  try {
    const existing = await listServices();
    if (existing.length > 0) {
      return c.json({ ok: true, seeded: false, services: existing });
    }
    const created: ServiceRecord[] = [];
    for (const s of SEED_SERVICES) {
      const id = crypto.randomUUID();
      const record: ServiceRecord = { id, ...s };
      await kv.set(`service:${id}`, record);
      created.push(record);
    }
    return c.json({ ok: true, seeded: true, services: created.sort((a, b) => a.sort_order - b.sort_order) });
  } catch (e) {
    console.log(`Error seeding services: ${e}`);
    return c.json({ ok: false, error: `Error seeding services: ${e}` }, 500);
  }
});

app.post("/make-server-e8cd329a/services", async (c) => {
  try {
    const body = await c.req.json();
    const existing = await listServices();
    const maxOrder = existing.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const id = crypto.randomUUID();
    const record: ServiceRecord = {
      id,
      service_name: body.service_name ?? "",
      service_value: body.service_value ?? "",
      description: body.description ?? "",
      duration_minutes: Number(body.duration_minutes) || 0,
      price: body.is_free ? 0 : Number(body.price) || 0,
      is_free: Boolean(body.is_free),
      is_active: body.is_active ?? true,
      sort_order: maxOrder + 1,
    };
    await kv.set(`service:${id}`, record);
    return c.json({ ok: true, service: record });
  } catch (e) {
    console.log(`Error creating service: ${e}`);
    return c.json({ ok: false, error: `Error creating service: ${e}` }, 500);
  }
});

app.put("/make-server-e8cd329a/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing = (await kv.get(`service:${id}`)) as ServiceRecord | null;
    if (!existing) return c.json({ ok: false, error: `Service ${id} not found` }, 404);
    const body = await c.req.json();
    const updated: ServiceRecord = {
      ...existing,
      ...body,
      id,
      duration_minutes:
        body.duration_minutes !== undefined ? Number(body.duration_minutes) || 0 : existing.duration_minutes,
      price: (body.is_free ?? existing.is_free) ? 0 : Number(body.price ?? existing.price) || 0,
      is_free: body.is_free !== undefined ? Boolean(body.is_free) : existing.is_free,
    };
    await kv.set(`service:${id}`, updated);
    return c.json({ ok: true, service: updated });
  } catch (e) {
    console.log(`Error updating service: ${e}`);
    return c.json({ ok: false, error: `Error updating service: ${e}` }, 500);
  }
});

app.delete("/make-server-e8cd329a/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`service:${id}`);
    return c.json({ ok: true });
  } catch (e) {
    console.log(`Error deleting service: ${e}`);
    return c.json({ ok: false, error: `Error deleting service: ${e}` }, 500);
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
