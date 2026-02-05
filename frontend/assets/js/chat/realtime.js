// frontend/assets/js/chat/realtime.js
import { getSupabaseClient } from './supabaseClient.js';

export async function subscribeToSorteoInserts({ sorteoId, onInsert }) {
  console.log('[chat] realtime subscribe start', { sorteoId });
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
        console.log('[chat] realtime payload', payload);
        onInsert(payload.new);
      }
    )
    .subscribe();

  console.log('[chat] realtime subscribe called');
  return () => supabase.removeChannel(channel);
}
