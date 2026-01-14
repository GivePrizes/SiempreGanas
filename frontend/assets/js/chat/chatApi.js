// frontend/assets/js/chat/chatApi.js
import { getChatBaseUrl } from './config.js';

export async function fetchMessages({ sorteoId, limit = 50, cursor = null }) {
  const base = getChatBaseUrl();
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor?.beforeCreatedAt) params.set('beforeCreatedAt', cursor.beforeCreatedAt);
  if (cursor?.beforeId) params.set('beforeId', cursor.beforeId);

  const res = await fetch(`${base}/chat/${sorteoId}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postMessage({ sorteoId, token, mensaje }) {
  const base = getChatBaseUrl();
  const res = await fetch(`${base}/chat/${sorteoId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ mensaje }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
