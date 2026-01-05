// frontend/assets/js/chat/realtime.js
import { getSupabaseConfig } from './config.js';

export async function createRealtimeClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) throw new Error('Falta SUPABASE_URL / SUPABASE_ANON_KEY');
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  return mod.createClient(url, anonKey);
}

export function subscribeToSorteoInserts({ supabase, sorteoId, onInsert }) {
  const channel = supabase
    .channel(`chat_sorteo_${sorteoId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `sorteo_id=eq.${sorteoId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
