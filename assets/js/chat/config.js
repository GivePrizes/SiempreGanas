// frontend/assets/js/chat/config.js

export function getChatBaseUrl() {
  // Solo la raiz del servicio, sin /api/chat
  return (
    window.CHAT_URL ||
    import.meta.env.VITE_CHAT_URL ||
    import.meta.env.VITE_CHAT_SERVICE_URL ||
    ""
  );
}

// Endpoint de chat para un sorteo
export function getChatEndpoint(sorteoId, { isAdmin = false } = {}) {
  const base = isAdmin ? '/api/admin/chat' : '/api/chat';
  return `${getChatBaseUrl()}${base}/${sorteoId}`;
}
