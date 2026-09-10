import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configurationError = !url || !key
  ? 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then restart Vite.'
  : !/^https?:\/\//i.test(url)
    ? 'VITE_SUPABASE_URL must start with https://. Copy the Project URL from Supabase → Connect, then restart Vite.'
    : '';

export const supabase = configurationError ? null : createClient(url, key);
