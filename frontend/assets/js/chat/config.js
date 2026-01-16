// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  // En producción: usa variable de entorno Vercel o fallback
  return window.CHAT_SERVICE_URL 
    || import.meta.env.VITE_CHAT_SERVICE_URL 
    || "https://chat-service-theta.vercel.app/chat";
}

export function getSupabaseConfig() {
  // Prioridad: variables inyectadas en window > .env > fallback vacío
  return {
    url: window.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: window.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  };
}

// Opcional: helper para construir URLs completas
export function getChatEndpoint(sorteoId) {
  return `${getChatBaseUrl()}/${sorteoId}`;
}