// frontend/assets/js/chat/chatApi.js
import { getChatEndpoint } from './config.js';

function safeJson(res) {
  return res.json().catch(() => ({}));
}

function friendlyMessage(status) {
  if (status === 401) return 'Sesión expirada';
  if (status === 403) return 'No tienes cupo para chatear';
  if (status === 429) return 'Espera unos segundos';
  return '';
}

/* ===============================
   Fetch mensajes (historial)
================================ */
export async function fetchMessages({
  sorteoId,
  token,
  limit = 50,
  cursor = null
}) {
  console.log('[chat] fetchMessages start', { sorteoId, limit, cursor });
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor?.beforeCreatedAt) params.set('beforeCreatedAt', cursor.beforeCreatedAt);
  if (cursor?.beforeId) params.set('beforeId', cursor.beforeId);

  try {
    const res = await fetch(
      `${getChatEndpoint(sorteoId, { isAdmin: false })}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await safeJson(res);
    console.log('[chat] fetchMessages response', { ok: res.ok, status: res.status, data });
    return { ok: res.ok, status: res.status, data, friendlyMessage: friendlyMessage(res.status) };
  } catch (err) {
    console.log('[chat] fetchMessages error', err);
    return { ok: false, status: 0, data: { error: err.message }, friendlyMessage: '' };
  }
}

/* ===============================
   Post mensaje normal (usuario)
   - Usa únicamente { mensaje }
   - Usa JWT en Authorization header
   - Devuelve { ok, status, data } para manejo en UI
================================ */
export async function postMessage({ sorteoId, token, mensaje, isAdmin = false }) {
  console.log('[chat] postMessage start', { sorteoId, isAdmin });
  try {
    const res = await fetch(getChatEndpoint(sorteoId, { isAdmin }), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mensaje: String(mensaje || '').trim() })
    });

    const data = await safeJson(res);
    console.log('[chat] postMessage response', { ok: res.ok, status: res.status, data });
    return { ok: res.ok, status: res.status, data, friendlyMessage: friendlyMessage(res.status) };
  } catch (err) {
    console.log('[chat] postMessage error', err);
    return { ok: false, status: 0, data: { error: err.message }, friendlyMessage: '' };
  }
}

/* ===============================
   Post mensaje global (admin) - WRAPPER
   Los admins deben enviar por /api/admin/chat usando su JWT.
   Si se pasa is_system se ignora y se envía por la ruta normal.
================================ */
export async function sendMessage({
  sorteoId,
  token,
  mensaje,
  is_system = false,
  isAdmin = false
}) {
  if (is_system) {
    // is_system se ignora en frontend
  }

  // Reutiliza postMessage para asegurar contrato { mensaje } y headers
  return await postMessage({ sorteoId, token, mensaje, isAdmin });
}

/* ===============================
   Moderación: silenciar usuario
================================ */
export async function muteUser(sorteoId, token, usuarioId, minutes = 10) {
  try {
    const res = await fetch(`${getChatEndpoint(sorteoId, { isAdmin: true })}/mute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ usuarioId, minutes })
    });

    const data = await safeJson(res);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

/* ===============================
   Moderación: eliminar mensaje
================================ */
export async function deleteMessage(sorteoId, token, messageId) {
  try {
    const res = await fetch(`${getChatEndpoint(sorteoId, { isAdmin: true })}/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await safeJson(res);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

/* ===============================
   Moderación: estado de usuario
================================ */
export async function getUserState(sorteoId, token, usuarioId) {
  try {
    const res = await fetch(`${getChatEndpoint(sorteoId, { isAdmin: true })}/user/${usuarioId}/state`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await safeJson(res);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message } };
  }
}
