-- jacsal-intake — initial schema (D1 / SQLite)
--
-- Split of responsibilities:
--   * CONFIG (tenants + their service catalogs + branding) lives in KV under
--     `tenant:<slug>` and `tenant:<slug>:service:<id>`. Config is read on nearly
--     every request and is tiny, so KV's edge caching beats a D1 round trip.
--   * DATA (leads, photos, assessments) lives here. Every row carries
--     `tenant_slug` so one Worker serves many landscapers.
--
-- Conventions:
--   * Timestamps are INTEGER epoch seconds, matching jacsal-auth.
--   * Booleans are INTEGER 0/1 (SQLite has no BOOLEAN).
--   * Lists and structured blobs are TEXT holding JSON (SQLite has no arrays).

-- 1. Leads --------------------------------------------------------------------
-- One row per property owner who starts intake. Created at step 1, updated in
-- place as they advance. `status` is the resume point if they come back later.
CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  tenant_slug   TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,

  -- Anonymous visitors own their lead via an opaque bearer token handed back
  -- once at creation. Only its SHA-256 is stored, so a leaked DB row can't be
  -- replayed. Every later write must present the token — a guessed lead UUID
  -- alone is not enough to read or modify someone's intake.
  token_hash    TEXT NOT NULL,

  -- Contact
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,

  -- Property
  service_address TEXT,
  city            TEXT,
  postal_code     TEXT,
  property_type   TEXT,      -- 'residential' | 'commercial'
  areas           TEXT,      -- JSON array: front | back | side | full
  gate_access     TEXT,      -- gate code, "unlocked", "call on arrival"
  pets_on_property INTEGER NOT NULL DEFAULT 0,
  access_notes    TEXT,

  -- What they asked for (before any AI suggestion)
  requested_services TEXT,   -- JSON array of service_value
  cadence            TEXT,   -- 'one-time' | 'weekly' | 'biweekly' | 'monthly'
  notes              TEXT,

  -- ---- Measurements -------------------------------------------------------
  -- Three independent sources, deliberately kept separate rather than collapsed
  -- into one number, so the admin can see WHY a figure is trusted:
  --   client_*  what the customer typed
  --   parcel_*  authoritative lot data from the parcel lookup (San Diego today)
  --   traced_*  exact geodesic area of a polygon the customer drew on satellite
  -- `turf_sqft` is the resolved value actually used for quoting.
  client_lot_sqft    REAL,
  client_turf_sqft   REAL,

  parcel_apn         TEXT,
  parcel_lot_sqft    REAL,
  parcel_zone        TEXT,
  parcel_source      TEXT,

  traced_turf_sqft   REAL,
  traced_polygon     TEXT,   -- JSON array of {lat,lng}, the drawn boundary

  turf_sqft          REAL,   -- resolved
  turf_sqft_source   TEXT,   -- 'client' | 'parcel' | 'traced'
  measurement_flag   TEXT,   -- set when sources disagree; shown to the admin

  tree_count      INTEGER,
  shrub_count     INTEGER,
  fence_length_ft REAL,

  -- Progress
  photos_completed     INTEGER NOT NULL DEFAULT 0,
  photos_skipped       INTEGER NOT NULL DEFAULT 0,
  assessment_completed INTEGER NOT NULL DEFAULT 0,

  -- Upsell conversion signal: compare against the assessment's addon_services
  -- to learn which AI suggestions actually get accepted.
  accepted_services TEXT,    -- JSON array
  declined_services TEXT,    -- JSON array

  -- Scheduling
  booking_date TEXT,         -- ISO date, e.g. 2026-08-24
  booking_time TEXT,         -- e.g. "09:00"

  status TEXT NOT NULL DEFAULT 'property'
    CHECK (status IN ('property','services','photos','assessment','booking','booked','completed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant  ON leads(tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email   ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(tenant_slug, status);

-- 2. Photos -------------------------------------------------------------------
-- Metadata only; bytes live in R2 (`jacsal-intake-photos`) under
-- `<tenant>/<lead_id>/<uuid>.<ext>`. The bucket is never public — the Worker
-- streams bytes to admins and to the vision call.
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,

  -- Which guided prompt this answers, so the vision prompt can say "this is the
  -- back yard" instead of leaving the model to infer it.
  area      TEXT NOT NULL DEFAULT 'other'
    CHECK (area IN ('front','back','side','problem','other')),
  caption   TEXT,

  r2_key    TEXT NOT NULL UNIQUE,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width     INTEGER,
  height    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_photos_lead   ON photos(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_photos_tenant ON photos(tenant_slug);

-- 3. Assessments --------------------------------------------------------------
-- One row per vision run. Append-only: a re-run inserts a new row so the prior
-- assessment stays visible for comparison, and admins can see exactly what the
-- model returned rather than only the rendered summary.
--
-- No prices anywhere in here, by design. The model maps photo conditions to
-- service_values from the tenant's own catalog; price is looked up from that
-- catalog at render time, so a catalog edit updates every future quote and the
-- model can never invent a dollar amount.
CREATE TABLE IF NOT EXISTS assessments (
  id          TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,

  status TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok','no_key','no_photos','refused','error')),
  error  TEXT,

  model       TEXT,
  photo_count INTEGER NOT NULL DEFAULT 0,

  observations         TEXT NOT NULL DEFAULT '[]',  -- [{area,condition,detail,severity}]
  recommended_services TEXT NOT NULL DEFAULT '[]',  -- [{service_value,reason,confidence}]
  addon_services       TEXT NOT NULL DEFAULT '[]',  -- [{service_value,reason,confidence}]
  crew_notes           TEXT,
  photo_quality_issues TEXT NOT NULL DEFAULT '[]',

  -- service_values the model returned that were NOT in the tenant's catalog.
  -- Dropped before the client sees anything; kept here so drift is visible
  -- rather than silent.
  rejected_service_values TEXT NOT NULL DEFAULT '[]',

  input_tokens  INTEGER,
  output_tokens INTEGER
);

CREATE INDEX IF NOT EXISTS idx_assessments_lead   ON assessments(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_tenant ON assessments(tenant_slug);
