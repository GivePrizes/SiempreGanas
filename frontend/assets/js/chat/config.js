// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  // Solo la raíz del servicio, sin /api/chat
  return (
    window.CHAT_URL ||
    import.meta.env.VITE_CHAT_URL ||
    import.meta.env.VITE_CHAT_SERVICE_URL ||
    ""
  );
}

export function getSupabaseConfig() {
  return {
    url:
      window.SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL ||
      "",
    anonKey:
      window.SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      ""
  };
}

// Endpoint de chat para un sorteo
export function getChatEndpoint(sorteoId, { isAdmin = false } = {}) {
  const base = isAdmin ? '/api/admin/chat' : '/api/chat';
  return `${getChatBaseUrl()}${base}/${sorteoId}`;
}
