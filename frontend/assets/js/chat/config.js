// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  return "https://chat-service-theta.vercel.app/api";
}

export function getSupabaseConfig() {
  return {
    url: window.SUPABASE_URL || "",
    anonKey: window.SUPABASE_ANON_KEY || ""
  };
}
