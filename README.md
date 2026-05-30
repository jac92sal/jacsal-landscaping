# AI-Powered Client Screening & Booking Application

A two-part screening system that uses AI to align services with client needs before consultation booking. Built with React + Vite, styled with Tailwind CSS, and backed by Supabase.

---

## Quick Start

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and [pnpm](https://pnpm.io/) (`corepack enable` will provide it).

```bash
# 1. Install dependencies
pnpm install

# 2. Configure your Supabase connection (see "Configuration" below)
cp .env.example .env
#    then edit .env with your own project values

# 3. Create the database table
#    Run the SQL in supabase-schema.sql in your Supabase SQL Editor
#    (see DATABASE_SETUP.md for step-by-step instructions)

# 4. Start the dev server
pnpm dev          # http://localhost:5173

# 5. Build for production
pnpm build        # output in dist/
```

> The demo ships with working fallback credentials, so `pnpm dev` runs out of
> the box without a `.env`. To point it at **your own** Supabase project — which
> every production / customer install should do — set the env vars below.

---

## Configuration

Connection details are read from environment variables, with the bundled demo
project used as a fallback. Copy `.env.example` to `.env` and fill in your values:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | one of these | Full project URL, e.g. `https://abc123.supabase.co` |
| `VITE_SUPABASE_PROJECT_ID` | one of these | Project ref only; URL is derived from it |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key (Project Settings → API) |

Find these in your Supabase dashboard under **Project Settings → API**.

### 🔑 A note on keys (important)

- **The anon key is a *public* key.** It is designed to ship in the browser and
  is protected by **Row Level Security (RLS)**, not by being secret. Putting it
  in `VITE_SUPABASE_ANON_KEY` is correct and safe.
- **The `service_role` key is a *secret*.** It must **never** appear in any `.env`,
  in client code, or in the browser bundle. It lives only in
  **Supabase Edge Function secrets** and is read server-side via
  `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` (see `supabase/functions/server/`).
- `.env` files are git-ignored. Only `.env.example` (with placeholders) is committed.

---

## Database Setup

Run the SQL in [`supabase-schema.sql`](./supabase-schema.sql) in your Supabase
SQL Editor to create:

- `screening_responses` table
- Indexes for performance
- Row Level Security policies

Full walkthrough: [`DATABASE_SETUP.md`](./DATABASE_SETUP.md).

> ⚠️ The default RLS policies allow public read/write for easy prototyping.
> Tighten these before going to production — see the checklist in [`SETUP.md`](./SETUP.md).

---

## Features

### 📋 Two-Part Screening Process

**Screening One — Initial Service Alignment**
- Collects basic client information
- Service interest selection
- Budget and timeline preferences
- Project description
- **AI Analysis**: generates an alignment score and recommendations

**Screening Two — Detailed Information**
- Displays AI analysis results
- In-depth questions about goals and challenges
- Previous experience context
- Additional notes for customization

### 📅 Booking Calendar
- Interactive month/day calendar
- Available time slot selection
- Booking summary with confirmation
- Automatic date validation (no past dates)

### ✅ Confirmation Page
- Booking details summary
- Next steps guide
- Option to start over

---

## Application Flow

1. **User arrives** → Initial screening form
2. **AI analyzes** → Generates alignment score (75–90%)
3. **Detailed screening** → Collects additional context
4. **Calendar booking** → User selects date and time
5. **Confirmation** → Booking complete

All screening responses and bookings are stored in Supabase (client contact info,
service alignment data, AI analysis results, booking date/time, and progress
through the flow).

---

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build tool**: Vite 6
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI primitives + MUI
- **Icons**: Lucide React
- **Date Handling**: date-fns

> **Hosting roadmap:** the demo runs on Supabase. A future migration to a
> Cloudflare-native stack is planned but not part of this build.

---

## Design System

- **Aesthetic**: Warm, professional boutique feel
- **Colors**: Terra cotta primary, sage green accent, cream background
- **Typography**: Playfair Display (headings), Inter (body), JetBrains Mono (data)
- **Style**: Clean, centered layouts with generous whitespace

Originally designed in Figma (Figma Make export).

---

## AI Analysis

The AI analysis evaluates service interest alignment, project complexity and
scope, and budget/timeline fit, then generates personalized recommendations.
Scores range from 75–90% based on service-type match.

Currently the analysis runs client-side. To enhance it with a real model
(e.g. Anthropic Claude), update `generateAIAnalysis()` in `src/app/App.tsx` to
call an API — keep any API key server-side (Supabase Edge Function), never in
the browser. See [`SETUP.md`](./SETUP.md) for customization points.

---

## Notes

- All required fields are marked with red asterisks
- Form validation prevents submission until required fields are complete
- Calendar only allows booking future dates
- Responsive design works on mobile and desktop
