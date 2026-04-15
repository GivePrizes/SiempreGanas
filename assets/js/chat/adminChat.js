// Admin Chat JS
// Requiere: chatApi.js, store.js, ui.js
import {
  postMessage,
  muteUser,
  deleteMessage,
  getUserState,
  fetchMessages,
  normalizeChatMessage
} from './chatApi.js?v=20260412a';
import { createChatStore } from './store.js?v=20260329c';
import { renderMessages, isBottom, toBottom } from './ui.js?v=20260329c';
import { subscribeToSorteoInserts } from './realtime.js?v=20260329c';

const CHAT_SYNC_VISIBLE_MS = 12000;
const CHAT_SYNC_HIDDEN_MS = 25000;
const CHAT_STREAM_RECOVERY_MS = 2200;
const CHAT_MAX_BACKOFF_MS = 60000;

/* ===============================
   Init Admin Chat
================================ */
export async function initAdminChat({ sorteoId, token }) {
  if (!sorteoId || !token) return;

  const bodyEl  = document.getElementById('adminChatBody');
  const inputEl = document.getElementById('adminChatInput');
  const sendEl  = document.getElementById('adminChatSend');
  const hintEl  = document.getElementById('adminChatHint');

  // Store de mensajes (admin)
  const store = createChatStore({ myUsuarioId: 'admin' });
  let unsub = null;
  let syncTimer = null;
  let syncInFlight = false;
  let disposed = false;
  let syncErrorCount = 0;

  /* ===============================
     Render con acciones de moderación
  =============================== */
  function renderAdminMessages({ forceBottom = false } = {}) {
    renderMessages({
      containerEl: bodyEl,
      messages: store.getFiltered(),
      myUsuarioId: 'admin',
      renderActions: (msg) => {
        // Los botones SOLO para mensajes normales (no sistema)
        if (!(msg.is_system ?? msg.isSystem)) {
          return `
            <span class="actions">
              <button class="mute-btn" data-user="${msg.usuario.id}">
                Silenciar
              </button>
              <button class="delete-btn" data-id="${msg.id}">
                Eliminar
              </button>
              <button class="state-btn" data-user="${msg.usuario.id}">
                Estado
              </button>
            </span>
          `;
        }
        return '';
      }
    });

    if (forceBottom || isBottom(bodyEl)) {
      toBottom(bodyEl);
    }
  }

  /* ===============================
     Append mensaje (preparado para realtime)
     ⚠️ Aún no se usa si no hay Supabase
  =============================== */
  function appendMessage(msg) {
    const message = normalizeChatMessage(msg);
    if (!message || store.has(message.id)) return;

    store.upsert(message);
    renderAdminMessages({ forceBottom: true });
  }

  function getSyncDelay() {
    const baseDelay = document.visibilityState === 'visible'
      ? CHAT_SYNC_VISIBLE_MS
      : CHAT_SYNC_HIDDEN_MS;

    if (syncErrorCount <= 0) {
      return baseDelay;
    }

    const multiplier = Math.min(2 ** Math.min(syncErrorCount - 1, 2), 4);
    return Math.min(baseDelay * multiplier, CHAT_MAX_BACKOFF_MS);
  }

  function scheduleSync(delay = getSyncDelay()) {
    if (disposed) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncLatestMessages();
    }, delay);
  }

  async function syncLatestMessages() {
    if (disposed || syncInFlight) return;

    syncInFlight = true;

    try {
      const data = await fetchMessages({ sorteoId, token, limit: 50 });
      const incoming = Array.isArray(data?.messages) ? data.messages : [];
      const unseen = incoming.filter((message) => message?.id && !store.has(message.id));

      if (unseen.length) {
        unseen.forEach(appendMessage);
      }
      syncErrorCount = 0;
    } catch (err) {
      syncErrorCount += 1;
      console.error('admin chat fallback sync error:', err);
    } finally {
      syncInFlight = false;
      scheduleSync();
    }
  }

  function handleStreamUnavailable(event) {
    if (String(event?.detail?.sorteoId || '') !== String(sorteoId)) return;
    scheduleSync(CHAT_STREAM_RECOVERY_MS);
  }

  function handleVisibilityRefresh() {
    if (document.visibilityState === 'visible') {
      syncLatestMessages();
      return;
    }
    scheduleSync();
  }

  /* ===============================
     History (carga inicial)
  =============================== */
  try {
    const data = await fetchMessages({ sorteoId, token, limit: 50 });
    console.log('Historial recibido:', data);
    store.upsertMany(data.messages || []);
    renderAdminMessages({ forceBottom: true });
  } catch (err) {
    console.error('Error cargando historial:', err);
    hintEl.textContent = 'No se pudo cargar el chat de admin.';
  }

  try {
    unsub = await subscribeToSorteoInserts({
      sorteoId,
      token,
      onInsert: appendMessage
    });
  } catch (err) {
    console.error('Error conectando chat admin realtime:', err);
    hintEl.textContent = 'El chat se cargó, pero la actualización en vivo no está disponible.';
  }

  scheduleSync();

  /* ===============================
     Enviar mensaje (ADMIN)
     IMPORTANTE: los admins usan su ruta dedicada para evitar reglas de participante.
  =============================== */
  async function send() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    sendEl.disabled = true;
    hintEl.textContent = '';

    const { ok, status, data } = await postMessage({
      sorteoId,
      token,
      mensaje: text,
      isAdmin: true
    });

    if (!ok) {
      if (status === 403 && data?.code === 'participation_required') {
        hintEl.textContent = '🔒 Solo participantes con número aprobado pueden escribir.';
        hintEl.style.color = '#ff6b6b';
      } else if (status === 403 && (data?.message || '').toLowerCase().includes('silenc')) {
        hintEl.textContent = data?.message || 'Has sido silenciado.';
        hintEl.style.color = '#f87171';
      } else if (status === 429) {
        hintEl.textContent = 'Demasiadas peticiones. Espera unos segundos.';
        hintEl.style.color = '#f59e0b';
      } else if (status === 404) {
        hintEl.textContent = 'Chat no disponible.';
        hintEl.style.color = '#f87171';
      } else {
        console.error('postMessage failed', status, data);
        hintEl.textContent = data?.error || data?.message || 'Error enviando mensaje';
        hintEl.style.color = '#f87171';
      }
    }

    if (data?.id) {
      appendMessage(data);
    } else if (data?.message?.id) {
      appendMessage(data.message);
    } else {
      scheduleSync(CHAT_STREAM_RECOVERY_MS);
    }

    sendEl.disabled = false;
    inputEl.focus();
  } 

  /* ===============================
     Eventos de envío
  =============================== */
  sendEl.addEventListener('click', send);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  /* ===============================
     Moderación (event delegation)
  =============================== */
  bodyEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('mute-btn')) {
      const usuarioId = e.target.dataset.user;
      const resp = await muteUser(sorteoId, token, usuarioId, 10);
      if (resp.ok) alert(`Usuario ${usuarioId} silenciado`);
    }

    if (e.target.classList.contains('delete-btn')) {
      const messageId = e.target.dataset.id;
      const resp = await deleteMessage(sorteoId, token, messageId);
      if (resp.ok) {
        e.target.closest('.chat-row')?.remove();
      }
    }

    if (e.target.classList.contains('state-btn')) {
      const usuarioId = e.target.dataset.user;
      const resp = await getUserState(sorteoId, token, usuarioId);
      if (resp.ok) {
        alert(
          `Estado usuario ${usuarioId}: ${
            resp.data.isMuted ? 'Silenciado' : 'Activo'
          }`
        );
      }
    }
  });

  window.addEventListener('chat-stream-unavailable', handleStreamUnavailable);
  document.addEventListener('visibilitychange', handleVisibilityRefresh);
  window.addEventListener('focus', handleVisibilityRefresh);

  window.addEventListener('beforeunload', () => {
    disposed = true;
    if (syncTimer) clearTimeout(syncTimer);
    unsub?.();
    window.removeEventListener('chat-stream-unavailable', handleStreamUnavailable);
    document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    window.removeEventListener('focus', handleVisibilityRefresh);
  });
}
