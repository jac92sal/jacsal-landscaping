# Database Setup - REQUIRED STEPS

## ✅ Supabase Connection
Your application is already connected to Supabase! The connection details are automatically configured.

## 🗄️ Database Tables

You need to create TWO sets of tables:
1. **Public Booking Tables** - For storing client bookings
2. **Admin Tables** - For admin dashboard and configuration

## Step 1: Create Public Booking Tables

**Run this SQL once to create the booking table:**

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/lceemzggwtuldkdbgort
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Run This SQL

```sql
-- Create the screening_responses table
CREATE TABLE IF NOT EXISTS screening_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Screening One Data
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_interest TEXT NOT NULL,
  budget_range TEXT,
  timeline TEXT,
  description TEXT NOT NULL,

  -- Screening Two Data (populated after step 2)
  goals TEXT,
  challenges TEXT,
  previous_experience TEXT,
  additional_notes TEXT,

  -- AI Analysis Results
  ai_analysis TEXT,
  alignment_score INTEGER,

  -- Booking Information
  booking_date TIMESTAMP WITH TIME ZONE,
  booking_time TEXT,

  -- Progress Tracking
  screening_one_completed BOOLEAN DEFAULT FALSE,
  screening_two_completed BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('screening_one', 'screening_two', 'booking', 'booked', 'completed')) DEFAULT 'screening_one'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_screening_responses_email ON screening_responses(email);
CREATE INDEX IF NOT EXISTS idx_screening_responses_status ON screening_responses(status);
CREATE INDEX IF NOT EXISTS idx_screening_responses_booking_date ON screening_responses(booking_date);

-- Enable Row Level Security
ALTER TABLE screening_responses ENABLE ROW LEVEL SECURITY;

-- Allow public access for the prototype (adjust for production!)
CREATE POLICY "Allow public insert" ON screening_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON screening_responses
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read" ON screening_responses
  FOR SELECT USING (true);
```

### Step 3: Run the Query
Click the **Run** button (or press Cmd/Ctrl + Enter)

### Step 4: Verify Success
You should see: "Success. No rows returned"

Go to **Table Editor** → **screening_responses** to confirm the table was created.

---

## Step 2: Create Admin Dashboard Tables

**IMPORTANT:** To use the admin dashboard features, run the admin schema:

1. Copy the contents of `supabase-admin-schema.sql`
2. Paste into SQL Editor
3. Click **Run**

This creates tables for:
- Admin authentication
- Secrets vault (API keys)
- Services configuration
- Screening questions customization
- Time slots management
- App settings

**See `ADMIN_SETUP.md` for complete admin dashboard documentation.**

## Step 3: Create Branding Tables (For White Label)

**NEW:** For white-label branding and embed features:

1. Copy the contents of `supabase-branding-schema.sql`
2. Paste into SQL Editor
3. Click **Run**

This creates the `branding_settings` table for:
- Company information
- Logo and colors
- Typography
- Social media links
- White label settings
- Custom CSS

**See `WHITE_LABEL_GUIDE.md` for complete white-label setup.**

---

## ✨ You're Ready!

Once you've run BOTH SQL files, your application is fully functional. Test it by:
1. Filling out the initial screening form
2. Viewing the AI analysis
3. Completing the detailed screening
4. Booking a consultation time
5. Viewing the confirmation

All data will be saved to your Supabase database!

---

## 🔒 Production Security Note

The current RLS policies allow public access for easy prototyping. Before deploying to production:
- Implement authentication
- Restrict RLS policies to authenticated users
- Add rate limiting
- Validate input data
- Add proper error handling
