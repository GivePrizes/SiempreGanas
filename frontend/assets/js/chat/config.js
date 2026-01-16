// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  // Prioridad: variable global (window) > .env Vite/Vercel > fallback producción
  return window.CHAT_SERVICE_URL 
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
      || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidHBocWN0ZHZ5ZWpqdGd1Y3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODkyNTMsImV4cCI6MjA3OTM2NTI1M30.fZ5UxsYaEoF058bgWQDnFaow0zHJwI64G3nvrGmSLvQ"
  };
}

// Helper recomendado (útil en chatApi.js / index.js)
export function getChatEndpoint(sorteoId) {
  return `${getChatBaseUrl()}/${sorteoId}`;
}