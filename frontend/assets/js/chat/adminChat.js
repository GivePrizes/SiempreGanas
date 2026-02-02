// Admin Chat JS
// Requiere: chatApi.js, realtime.js, store.js, ui.js
import { 
  sendMessage, 
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

  const bodyEl    = document.getElementById('adminChatBody');
  const inputEl   = document.getElementById('adminChatInput');
  const sendEl    = document.getElementById('adminChatSend');
  const hintEl    = document.getElementById('adminChatHint');

  const store = createChatStore({ myUsuarioId: 'admin' });
  let unsub = null;

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
        if (!msg.isSystem) {
          return `
            <span class="actions">
              <button class="mute-btn" data-user="${msg.usuario.id}">Silenciar</button>
              <button class="delete-btn" data-id="${msg.id}">Eliminar</button>
              <button class="state-btn" data-user="${msg.usuario.id}">Estado</button>
            </span>
          `;
        }
        return '';
      }
    });

    if (atBottom) toBottom(bodyEl);
  }

  /* ===============================
     Append realtime message
  =============================== */
  function appendMessage(m) {
    if (!m || store.has(m.id)) return;
    store.upsertMany([m]);
    renderAdminMessages();

    // Animación visual
    setTimeout(() => {
      bodyEl.querySelector('.chat-row:last-child')?.classList.add('pop');
    }, 10);
  }

    /* ===============================
    History
    ================================ */
    try {
    const data = await fetchMessages({ sorteoId, limit: 50 });
    console.log('Historial recibido:', data);
    store.upsertMany(data.messages || []);
    renderAdminMessages();
    } catch (err) {
    console.error('Error cargando historial:', err);
    hintEl.textContent = 'No se pudo cargar el chat de admin.';
    }

  
    /* ===============================
    Send mensaje global
    ================================ */
    async function send() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    sendEl.disabled = true;

    try {
        const res = await fetch(`${window.API_URL}/api/admin/chat/${sorteoId}/system`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` // JWT del admin
        },
        body: JSON.stringify({ mensaje: text })
        });

        const data = await res.json();
        if (!res.ok) {
        hintEl.textContent = 'Error enviando mensaje admin';
        hintEl.style.color = '#f87171';
        }
    } catch (err) {
        console.error("Error en envío admin:", err);
        hintEl.textContent = 'Error interno al enviar mensaje';
        hintEl.style.color = '#f87171';
    }

    sendEl.disabled = false;
    }

  /* ===============================
     Moderación: delegar eventos
  =============================== */
  bodyEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('mute-btn')) {
      const usuarioId = e.target.dataset.user;
      const resp = await muteUser(sorteoId, token, usuarioId, 10); // 10 min por defecto
      if (resp.ok) {
        alert(`Usuario ${usuarioId} silenciado`);
      }
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
        alert(`Estado usuario ${usuarioId}: ${resp.data.isMuted ? 'Silenciado' : 'Activo'}`);
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    unsub?.();
  });
}