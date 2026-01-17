// frontend/assets/js/chat/config.js
export function getChatBaseUrl() {
  // Retorna la URL base del Chat Service (sin /chat)
  return window.CHAT_URL 
    || import.meta.env.VITE_CHAT_SERVICE_URL 
    || "https://chat-service-six.vercel.app";
}

export function getSupabaseConfig() {
  return {
    url: window.SUPABASE_URL 
      || import.meta.env.VITE_SUPABASE_URL 
      || "https://wbtphqctdvyejjtgucuk.supabase.co",
    anonKey: window.SUPABASE_ANON_KEY 
      || import.meta.env.VITE_SUPABASE_ANON_KEY 
      || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  };
}

// Helper recomendado
// frontend/assets/js/chat/config.js
export function getChatEndpoint(sorteoId) {
  const base = 'https://chat-service-six.vercel.app/api/chat';
  return `${base}/${sorteoId}`;
}