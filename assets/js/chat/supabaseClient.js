// frontend/assets/js/chat/supabaseClient.js
import { getSupabaseConfig } from './config.js';

let supabaseInstance = null;

export async function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseConfig();

  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
  );

  supabaseInstance = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } }
  });

  return supabaseInstance;
}
