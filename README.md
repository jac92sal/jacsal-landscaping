# AI-Powered Client Screening & Booking Application

A two-part screening system with **comprehensive admin dashboard** that uses AI to align services with client needs before consultation booking. **Fully configurable without code!**

## ✨ New: Admin Dashboard

**Complete control without coding:**
- 🔐 **Secrets Vault** - Securely store API keys (OpenAI, Google Calendar, Resend, etc.)
- 📋 **Services Manager** - Add/edit/remove services shown to clients
- ❓ **Questions Manager** - Customize screening questions for both steps
- 📊 **Bookings View** - Monitor all consultations and responses
- ⚙️ **Settings** - Configure app name, features, and time slots
- 📈 **Dashboard** - View statistics and recent activity

**Access:** Navigate to `/admin` (default: admin@example.com / admin123)

See **`ADMIN_SETUP.md`** for complete admin guide.

## Features

### 📋 Two-Part Screening Process

**Screening One: Initial Service Alignment**
- Collects basic client information
- Service interest selection
- Budget and timeline preferences
- Project description
- **AI Analysis**: Automatically generates alignment score and recommendations

**Screening Two: Detailed Information**
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

## Database Setup

**Required:** Run TWO SQL files in your Supabase SQL Editor:

1. **`supabase-schema.sql`** - Public booking tables
2. **`supabase-admin-schema.sql`** - Admin dashboard tables

See **`DATABASE_SETUP.md`** for step-by-step instructions.

## Application Flow

1. **User arrives** → Initial screening form
2. **AI analyzes** → Generates alignment score (75-90%)
3. **Detailed screening** → Collects additional context
4. **Calendar booking** → User selects date and time
5. **Confirmation** → Booking complete with email confirmation

## Data Storage

All screening responses and bookings are stored in Supabase with:
- Client contact information
- Service alignment data
- AI analysis results
- Booking date/time
- Progress tracking through the flow

## Design System

- **Aesthetic**: Warm, professional boutique feel
- **Colors**: Terra cotta primary, sage green accent, cream background
- **Typography**: Playfair Display (headings), Inter (body), JetBrains Mono (data)
- **Style**: Clean, centered layouts with generous whitespace

## AI Analysis

The AI analysis evaluates:
- Service interest alignment
- Project complexity and scope
- Budget and timeline fit
- Generates personalized recommendations

Scores range from 75-90% based on service type match.

## Technology Stack

- **Frontend**: React 18, TypeScript
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL) - Auto-configured in Make
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Quick Start

1. **Run Database Setup**: Execute both SQL files in Supabase (see `DATABASE_SETUP.md`)
2. **Access Admin**: Go to `/admin` and login with default credentials
3. **Customize**: 
   - Add your services
   - Customize screening questions
   - Add API keys for integrations
4. **Share**: Send clients to your booking URL
5. **Monitor**: Check admin dashboard for bookings

## Supabase Configuration

The application automatically connects to Supabase using credentials from `/utils/supabase/info.tsx`. No manual environment variable setup is needed!

## Notes

- All required fields are marked with red asterisks
- Form validation prevents submission until required fields are complete
- Calendar only allows booking future dates
- AI analysis is generated client-side (can be enhanced with real AI API)
- Responsive design works on mobile and desktop
