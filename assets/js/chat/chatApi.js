// frontend/assets/js/chat/chatApi.js
import { getChatEndpoint } from './config.js';

/* ===============================
   Fetch mensajes (historial)
================================ */
export async function fetchMessages({ sorteoId, limit = 50, cursor = null }) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor?.beforeCreatedAt) params.set('beforeCreatedAt', cursor.beforeCreatedAt);
  if (cursor?.beforeId) params.set('beforeId', cursor.beforeId);

  try {
    const res = await fetch(`${getChatEndpoint(sorteoId)}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('fetchMessages error:', err);
    throw err;
  }
}

/* ===============================
   Post mensaje normal (usuario)
   - Usa únicamente { mensaje }
   - Usa JWT en Authorization header
   - Devuelve { ok, status, data } para manejo en UI
================================ */
export async function postMessage({ sorteoId, token, mensaje }) {
  try {
    const res = await fetch(getChatEndpoint(sorteoId), {
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

/* ===============================
   Post mensaje global (admin) - WRAPPER
   El frontend NO debe usar endpoints admin separados (/system).
   Los admins envían por la misma ruta de usuario usando su JWT.
   Si se pasa is_system se ignora y se envía por la ruta normal.
================================ */
export async function sendMessage({ sorteoId, token, mensaje, is_system = false }) {
  if (is_system) {
    console.warn('sendMessage: is_system flag ignored. Sending through regular chat endpoint with JWT.');
  }

  // Reutiliza postMessage para asegurar contrato { mensaje } y headers
  return await postMessage({ sorteoId, token, mensaje });
}

/* ===============================
   Moderación: silenciar usuario
================================ */
export async function muteUser(sorteoId, token, usuarioId, minutes = 10) {
  try {
    const res = await fetch(`${getChatEndpoint(sorteoId)}/mute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ usuarioId, minutes })
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('muteUser error:', err);
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

/* ===============================
   Moderación: eliminar mensaje
================================ */
export async function deleteMessage(sorteoId, token, messageId) {
  try {
    const res = await fetch(`${getChatEndpoint(sorteoId)}/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('deleteMessage error:', err);
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

/* ===============================
   Moderación: estado de usuario
================================ */
export async function getUserState(sorteoId, token, usuarioId) {
  try {
    const res = await fetch(`${getChatEndpoint(sorteoId)}/user/${usuarioId}/state`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('getUserState error:', err);
    return { ok: false, status: 0, data: { error: err.message } };
  }
}