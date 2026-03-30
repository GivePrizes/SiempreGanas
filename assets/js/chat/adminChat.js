// Admin Chat JS
// Requiere: chatApi.js, store.js, ui.js
import {
  postMessage,
  muteUser,
  deleteMessage,
  getUserState,
  fetchMessages
} from './chatApi.js?v=20260329b';
import { createChatStore } from './store.js?v=20260329b';
import { renderMessages, isBottom, toBottom } from './ui.js?v=20260329b';

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

    if (atBottom) toBottom(bodyEl);
  }

  /* ===============================
     Append mensaje (preparado para realtime)
     ⚠️ Aún no se usa si no hay Supabase
  =============================== */
  function appendMessage(msg) {
    store.upsert(msg);
    renderAdminMessages();
  }

  /* ===============================
     History (carga inicial)
  =============================== */
  try {
    const data = await fetchMessages({ sorteoId, token, limit: 50 });
    console.log('Historial recibido:', data);
    store.upsertMany(data.messages || []);
    renderAdminMessages();
  } catch (err) {
    console.error('Error cargando historial:', err);
    hintEl.textContent = 'No se pudo cargar el chat de admin.';
  }

  /* ===============================
     Enviar mensaje (ADMIN)
     IMPORTANTE: los admins envían por la misma ruta de usuario usando su JWT.
  =============================== */
  async function send() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    sendEl.disabled = true;
    hintEl.textContent = '';

    const { ok, status, data } = await postMessage({ sorteoId, token, mensaje: text });

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

  window.addEventListener('beforeunload', () => {
    unsub?.();
  });
}
