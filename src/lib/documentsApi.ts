import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';

const BUCKET = 'client-documents';
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e8cd329a`;

export interface ClientDocument {
  id: string;
  created_at: string;
  screening_id: string | null;
  email: string | null;
  label: string | null;
  description: string | null;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
}

export interface UploadDocumentInput {
  screeningId: string | null;
  email: string;
  label: string;
  description: string;
  file: File;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

// Uploads the file to the private bucket, then records its metadata.
export async function uploadClientDocument(input: UploadDocumentInput): Promise<ClientDocument> {
  const { screeningId, email, label, description, file } = input;

  const folder = screeningId || email || 'unassigned';
  const path = `${folder}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Could not upload "${file.name}": ${uploadError.message}`);
  }

  const { data, error: insertError } = await supabase
    .from('screening_documents')
    .insert({
      screening_id: screeningId,
      email,
      label: label || file.name,
      description: description || null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Uploaded "${file.name}" but could not save its details: ${insertError.message}`);
  }

  return data as ClientDocument;
}

export async function fetchDocuments(): Promise<ClientDocument[]> {
  const { data, error } = await supabase
    .from('screening_documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error loading documents: ${error.message}`);
  return (data || []) as ClientDocument[];
}

// Asks the edge function (service role) for a short-lived signed URL so admins
// can open a private document without the bucket being public.
export async function getDocumentSignedUrl(path: string): Promise<string> {
  const res = await fetch(`${BASE}/documents/signed-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ path }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok || !json.url) {
    throw new Error(json?.error || `Could not get document link (${res.status})`);
  }
  return json.url as string;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
