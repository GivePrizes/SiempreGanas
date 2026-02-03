// Admin Chat JS
// Requiere: chatApi.js, store.js, ui.js
import {
  postMessage,
  muteUser,
  deleteMessage,
  getUserState,
  fetchMessages
} from './chatApi.js';

import { createChatStore } from './store.js';
import { renderMessages, isBottom, toBottom } from './ui.js';

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
  let unsub = null; // reservado para realtime futuro
  let canUseChat = true;

  /* ===============================
     Render con acciones de moderación
  =============================== */
  function renderAdminMessages() {
    const atBottom = isBottom(bodyEl);

    renderMessages({
      containerEl: bodyEl,
      messages: store.getFiltered(),
      myUsuarioId: 'admin',
      renderActions: (msg) => {
        const userId = msg?.usuario?.id ?? msg?.usuario_id ?? null;
        // Los botones SOLO para mensajes normales (no sistema)
        if (!msg.is_system && userId) {
          return `
            <span class="actions">
              <button class="mute-btn" data-user="${userId}">
                Silenciar
              </button>
              <button class="delete-btn" data-id="${msg.id}">
                Eliminar
              </button>
              <button class="state-btn" data-user="${userId}">
                Estado
              </button>
            </span>
          `;
        }
        return '';
      }
    });

    if (atBottom) toBottom(bodyEl);
  }

  /* ===============================
     Append mensaje (preparado para realtime)
     ⚠️ Aún no se usa si no hay Supabase
  =============================== */
  function appendMessage(msg) {
    store.upsertMany([msg]);
    renderAdminMessages();
  }

  /* ===============================
     History (carga inicial)
  =============================== */
  const history = await fetchMessages({ sorteoId, token, limit: 50 });
  if (!history.ok) {
    if (history.status === 401) {
      canUseChat = false;
      hintEl.textContent = history.friendlyMessage || 'Sesión expirada. Inicia sesión nuevamente.';
      hintEl.style.color = '#f87171';
      inputEl.disabled = true;
      sendEl.disabled = true;
    } else if (history.status === 403) {
      hintEl.textContent = history.friendlyMessage || 'No tienes permisos de admin para este chat.';
      hintEl.style.color = '#f87171';
    } else if (history.status === 429) {
      hintEl.textContent = history.friendlyMessage || 'Demasiadas peticiones. Espera unos segundos.';
      hintEl.style.color = '#f59e0b';
    } else {
      hintEl.textContent = 'No se pudo cargar el chat de admin.';
      hintEl.style.color = '#f87171';
    }
  } else {
    store.upsertMany(history.data?.messages || []);
    renderAdminMessages();
  }

  /* ===============================
     Enviar mensaje (ADMIN)
     IMPORTANTE: los admins envían por la misma ruta de usuario usando su JWT.
  =============================== */
  async function send() {
    if (!canUseChat) return;
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    sendEl.disabled = true;
    hintEl.textContent = '';

    const { ok, status, data, friendlyMessage } = await postMessage({
      sorteoId,
      token,
      mensaje: text,
      isAdmin: true
    });

    if (!ok) {
      if (status === 401) {
        canUseChat = false;
        hintEl.textContent = friendlyMessage || 'Sesión expirada. Inicia sesión nuevamente.';
        hintEl.style.color = '#f87171';
        inputEl.disabled = true;
        sendEl.disabled = true;
      } else if (status === 403 && data?.code === 'participation_required') {
        hintEl.textContent = '🔒 Solo participantes con número aprobado pueden escribir.';
        hintEl.style.color = '#ff6b6b';
      } else if (status === 403 && (data?.message || '').toLowerCase().includes('silenc')) {
        hintEl.textContent = data?.message || 'Has sido silenciado.';
        hintEl.style.color = '#f87171';
      } else if (status === 429) {
        hintEl.textContent = friendlyMessage || 'Demasiadas peticiones. Espera unos segundos.';
        hintEl.style.color = '#f59e0b';
      } else if (status === 404) {
        hintEl.textContent = 'Chat no disponible.';
        hintEl.style.color = '#f87171';
      } else {
        console.error('postMessage failed', status, data);
        hintEl.textContent = data?.error || 'Error enviando mensaje';
        hintEl.style.color = '#f87171';
      }
    }

    sendEl.disabled = false;
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
  function handleActionError(resp, fallback) {
    if (resp.status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (resp.status === 403) return 'No tienes permisos para esta acción.';
    if (resp.status === 429) return 'Demasiadas peticiones. Espera unos segundos.';
    return resp.data?.error || resp.data?.message || fallback;
  }

  bodyEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('mute-btn')) {
      const usuarioId = e.target.dataset.user;
      const resp = await muteUser(sorteoId, token, usuarioId, 10);
      if (resp.ok) {
        alert(`Usuario ${usuarioId} silenciado`);
      } else {
        alert(handleActionError(resp, 'No se pudo silenciar el usuario.'));
      }
    }

    if (e.target.classList.contains('delete-btn')) {
      const messageId = e.target.dataset.id;
      const resp = await deleteMessage(sorteoId, token, messageId);
      if (resp.ok) {
        e.target.closest('.chat-row')?.remove();
      } else {
        alert(handleActionError(resp, 'No se pudo eliminar el mensaje.'));
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
      } else {
        alert(handleActionError(resp, 'No se pudo obtener el estado del usuario.'));
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    unsub?.();
  });
}
