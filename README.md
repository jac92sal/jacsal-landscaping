# AI-Powered Client Screening & Booking Application

A two-part screening system that uses AI to align services with client needs before consultation booking.

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

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor to create:
- `screening_responses` table
- Indexes for performance
- Row Level Security policies

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
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL) - Auto-configured in Make
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Supabase Configuration

The application automatically connects to Supabase using credentials from `/utils/supabase/info.tsx`. No manual environment variable setup is needed!

## Notes

- All required fields are marked with red asterisks
- Form validation prevents submission until required fields are complete
- Calendar only allows booking future dates
- AI analysis is generated client-side (can be enhanced with real AI API)
- Responsive design works on mobile and desktop
