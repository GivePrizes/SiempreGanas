// frontend/assets/js/chat/realtime.js
import { getSupabaseClient } from './supabaseClient.js';

export async function subscribeToSorteoInserts({ sorteoId, onInsert }) {
  const supabase = await getSupabaseClient();

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
    .subscribe();

  return () => supabase.removeChannel(channel);
}
