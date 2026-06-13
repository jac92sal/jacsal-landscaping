-- Client document uploads
-- Applied to the live project as migration `add_client_documents`.
-- Clients can attach documents at the end of the booking flow. File bytes live
-- in a PRIVATE storage bucket; only metadata is stored in this table. Admins
-- download files through the edge function (service role) via short-lived
-- signed URLs, so documents are never publicly readable.

-- 1. Documents metadata table (one row per uploaded file)
CREATE TABLE IF NOT EXISTS screening_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  screening_id UUID REFERENCES screening_responses(id) ON DELETE CASCADE,
  email TEXT,
  label TEXT,
  description TEXT,
  file_path TEXT NOT NULL,      -- path within the storage bucket
  file_name TEXT,               -- original filename
  file_size BIGINT,
  mime_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_screening_documents_screening_id ON screening_documents(screening_id);
CREATE INDEX IF NOT EXISTS idx_screening_documents_email ON screening_documents(email);

ALTER TABLE screening_documents ENABLE ROW LEVEL SECURITY;

-- Mirror the existing screening_responses posture: public (anon) may insert their
-- own document rows and read metadata. File bytes stay private (see bucket below).
DROP POLICY IF EXISTS "Allow public insert documents" ON screening_documents;
CREATE POLICY "Allow public insert documents" ON screening_documents
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read documents" ON screening_documents;
CREATE POLICY "Allow public read documents" ON screening_documents
  FOR SELECT USING (true);

-- 2. Private storage bucket for client-uploaded documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/heic',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage policies: anon/authenticated may upload, but NOT read.
--    Admin downloads go through the edge function using the service role
--    (signed URLs), so client files are never publicly readable.
DROP POLICY IF EXISTS "Public can upload client documents" ON storage.objects;
CREATE POLICY "Public can upload client documents" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'client-documents');
