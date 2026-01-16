// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  // Prioridad: variable global (window) > .env Vite/Vercel > fallback producción
  return window.CHAT_URL 
    || import.meta.env.VITE_CHAT_SERVICE_URL 
    || "https://chat-service-theta.vercel.app/chat";
}

export function getSupabaseConfig() {
  return {
    url: window.SUPABASE_URL 
      || import.meta.env.VITE_SUPABASE_URL 
      || "https://wbtphqctdvyejjtgucuk.supabase.co",  // tu Supabase real
    anonKey: window.SUPABASE_ANON_KEY 
      || import.meta.env.VITE_SUPABASE_ANON_KEY 
      || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  };
}

// Helper recomendado (útil en chatApi.js / index.js)
export function getChatEndpoint(sorteoId) {
  return `${getChatBaseUrl()}/chat/${sorteoId}`;
}