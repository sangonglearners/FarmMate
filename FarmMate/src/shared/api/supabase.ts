import { createClient } from "@supabase/supabase-js";
import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '@/shared/constants/meta.env';

const url = VITE_SUPABASE_URL;
const anon = VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
