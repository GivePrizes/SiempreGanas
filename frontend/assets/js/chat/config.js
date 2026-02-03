// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  // Solo la raíz del servicio, sin /api/chat
  return (
    window.CHAT_URL ||
    import.meta.env.VITE_CHAT_SERVICE_URL ||
    "https://chat-service-theta.vercel.app"
  );
}

export function getSupabaseConfig() {
  return {
    url:
      window.SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL ||
      "https://wbtphqctdvyejjtgucuk.supabase.co",
    anonKey:
      window.SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  };
}

// Endpoint de chat para un sorteo
export function getChatEndpoint(sorteoId, { isAdmin = false } = {}) {
  const base = isAdmin ? '/api/admin/chat' : '/api/chat';
  return `${getChatBaseUrl()}${base}/${sorteoId}`;
}

// Clave interna para mensajes de sistema (admin)
export function getInternalApiKey() {
  return (
    window.INTERNAL_API_KEY ||
    import.meta.env.VITE_INTERNAL_API_KEY ||
    ""
  );
}
