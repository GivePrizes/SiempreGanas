// frontend/assets/js/chat/realtime.js
import { getSupabaseConfig } from './config.js';

export async function createRealtimeClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) throw new Error('Falta SUPABASE_URL / SUPABASE_ANON_KEY');

  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
  );

  return createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } }
  });
}

export function subscribeToSorteoInserts({ supabase, sorteoId, onInsert }) {
  if (!sorteoId) throw new Error('sorteoId requerido');

  const channel = supabase
    .channel(`chat_sorteo_${sorteoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `sorteo_id=eq.${sorteoId}`
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('🟢 Realtime conectado');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
