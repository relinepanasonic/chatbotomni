'use client';

import { createClient } from '@supabase/supabase-js';

/**
 * Uploads the PDF straight from the browser to the ERP's private bucket with a one-time signed link (a big deck never passes through a server
 * function). The link is the only permission: the browser holds no login for the storage.
 */
export async function uploadToSignedUrl(target: { bucket: string; path: string; token: string }, file: File, contentType = file.type || 'application/pdf'): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return 'The upload is not set up (missing Supabase settings).';
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, { contentType });
  return error ? `The upload failed: ${error.message}` : null;
}
