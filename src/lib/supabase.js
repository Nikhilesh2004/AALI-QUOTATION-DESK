import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Whether the app has been wired to a project yet. Checked at the top of the
// tree so a missing env var shows a setup screen with instructions, rather
// than a blank page and a console error nobody sees.
export const isConfigured = Boolean(url && anonKey);

if (!isConfigured) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'aali-quotation-auth',
  },
});
