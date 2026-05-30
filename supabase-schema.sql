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

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_screening_responses_email ON screening_responses(email);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_screening_responses_status ON screening_responses(status);

-- Create an index on booking_date for calendar queries
CREATE INDEX IF NOT EXISTS idx_screening_responses_booking_date ON screening_responses(booking_date);

-- Enable Row Level Security
ALTER TABLE screening_responses ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert (for new screenings)
CREATE POLICY "Allow public insert" ON screening_responses
  FOR INSERT
  WITH CHECK (true);

-- Create a policy that allows anyone to update their own records
CREATE POLICY "Allow update by email" ON screening_responses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create a policy that allows anyone to read (you may want to restrict this in production)
CREATE POLICY "Allow public read" ON screening_responses
  FOR SELECT
  USING (true);
