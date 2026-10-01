import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2';
import { createHandler } from './handler.mjs';
import { createSupabaseAdapter } from './adapter.mjs';

// Use only pre-existing Edge runtime secrets; never accept service keys in requests.
Deno.serve(createHandler(() => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (url !== 'https://tcaghsjndfaxlsgaqrdi.supabase.co' || !serviceKey || !anonKey) throw new Error('configuration_unavailable');
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  return createSupabaseAdapter(createClient(url, serviceKey, { auth }), createClient(url, anonKey, { auth }));
}));
