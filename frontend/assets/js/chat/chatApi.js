// frontend/assets/js/chat/chatApi.js
import { getChatBaseUrl } from './config.js';

export async function fetchMessages({ sorteoId, limit = 50, cursor = null }) {
  const base = getChatBaseUrl(); // ya termina en /chat
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor?.beforeCreatedAt) params.set('beforeCreatedAt', cursor.beforeCreatedAt);
  if (cursor?.beforeId) params.set('beforeId', cursor.beforeId);

  try {
    const res = await fetch(`${base}/${sorteoId}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('fetchMessages error:', err);
    throw err;
  }
}

export async function postMessage({ sorteoId, token, mensaje }) {
  const base = getChatBaseUrl(); // ya termina en /chat
  try {
    const res = await fetch(`${base}/${sorteoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mensaje: mensaje.trim() })
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('postMessage error:', err);
    return { ok: false, status: 0, data: { error: err.message } };
  }
}