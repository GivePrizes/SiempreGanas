// frontend/assets/js/chat/config.js
export function getChatBaseUrl() {
  return (window.CHAT_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
}
export function getSupabaseConfig() {
  return { url: window.SUPABASE_URL || '', anonKey: window.SUPABASE_ANON_KEY || '' };
}
