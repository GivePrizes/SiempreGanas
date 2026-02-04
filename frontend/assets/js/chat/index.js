//chat/index.js
import { fetchMessages, postMessage } from './chatApi.js';
import { createChatStore } from './store.js';
import { bindFilters, renderMessages, isBottom, toBottom } from './ui.js';
import { subscribeToSorteoInserts } from './realtime.js';

/* ===============================
   Utils
=============================== */

/**
 * 
 * @param {*} token 
 * @returns 
 */

function usuarioIdFromToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))?.id ?? null;
  } catch {
    return null;
  }
}

/* ===============================
   Init
=============================== */

export async function initChat({ sorteoId, token }) {
  if (!sorteoId || !token) {
    return;
  }

  const myUsuarioId = usuarioIdFromToken(token);

  const bodyEl    = document.getElementById('chatBody');
  const inputEl   = document.getElementById('chatInput');
  const sendEl    = document.getElementById('chatSend');
  const hintEl    = document.getElementById('chatHint');
  const filtersEl = document.getElementById('chatFilters');
  const newBtnEl  = document.getElementById('chatNewBtn');

  const store = createChatStore({ myUsuarioId });

  let pendingNew = 0;
  let puedeEscribir = false;
  let unsub = null;
  let soundEnabled = false;
  let canUseChat = true;

  /* ===============================
     UI helpers
  =============================== */

  function updateChatPermission() {
    inputEl.disabled = !puedeEscribir || !canUseChat;
    sendEl.disabled = !puedeEscribir || !canUseChat;

    if (!hintEl) return;

    if (!canUseChat) {
      hintEl.textContent = 'Sesión no válida. Inicia sesión nuevamente.';
      hintEl.style.color = '#f87171';
    } else if (puedeEscribir) {
      hintEl.textContent = 'Escribe tu mensaje... (máx. 120 caracteres)';
      hintEl.style.color = '#ccc';
    } else {
      hintEl.textContent =
        '🔒 Solo participantes con número aprobado pueden escribir.';
      hintEl.style.color = '#ff6b6b';
    }
  }

  function rerender({ keepBottom = true } = {}) {
    const atBottom = isBottom(bodyEl);

    renderMessages({
      containerEl: bodyEl,
      messages: store.getFiltered(),
      myUsuarioId
    });

    if (keepBottom && atBottom) {
      toBottom(bodyEl);
      pendingNew = 0;
      newBtnEl?.classList.add('hidden');
    } else if (pendingNew > 0) {
      newBtnEl?.classList.remove('hidden');
      newBtnEl.textContent = `Nuevos mensajes (${pendingNew}) ↓`;
    }
  }

  /* ===============================
      Sound
  =============================== */

  function playPing() {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('/assets/sound/new-notification-SG.mp3');
      audio.volume = 0.4;
      audio.play();
    } catch {}
  }

  /* ===============================
     Optimistic UI
  =============================== */

  function addOptimisticMessage(text) {
    const tempId = `tmp-${Date.now()}-${Math.random()}`;

    store.upsertMany([{
      id: tempId,
      mensaje: text,
      is_system: false,
      created_at: new Date().toISOString(),
      usuario: { id: myUsuarioId, nombre: 'Tú' },
      _optimistic: true
    }]);

    rerender({ keepBottom: true });
    return tempId;
  }

  function replaceOptimistic(realMsg) {
    store.removeOptimisticByUserAndText(
      myUsuarioId,
      realMsg.mensaje
    );
  }

  /* ===============================
     Append realtime message
  =============================== */

  function appendMessage(m) {
    if (!m || store.has(m.id)) return;

    console.log('chat payload (realtime):', m);

    // 🔥 NORMALIZAR MENSAJE REALTIME
    const nombre =
      m.usuario?.nombre ??
      m.usuario?.alias ??
      (m.usuario_id === myUsuarioId ? 'Tú' : 'Usuario');

    const mensaje = {
      ...m,
      usuario: {
        id: m.usuario_id,
        nombre
      }
    };

    if (Number(mensaje.usuario.id) === Number(myUsuarioId)) {
      replaceOptimistic(mensaje);
    }

    const atBottom = isBottom(bodyEl);
    store.upsertMany([mensaje]);

    renderMessages({
      containerEl: bodyEl,
      messages: store.getFiltered(),
      myUsuarioId
    });

    if (!mensaje.is_system && Number(mensaje.usuario.id) !== Number(myUsuarioId)) {
      playPing();
    }

    setTimeout(() => {
      bodyEl.querySelector('.chat-row:last-child')?.classList.add('pop');
    }, 10);

    if (atBottom) {
      toBottom(bodyEl);
      pendingNew = 0;
      newBtnEl?.classList.add('hidden');
    } else {
      pendingNew++;
      newBtnEl?.classList.remove('hidden');
      if (newBtnEl) {
        newBtnEl.textContent = `Nuevos mensajes (${pendingNew}) ↓`;
      }
    }
  }


  /* ===============================
     Filters & buttons
  =============================== */

  bindFilters({
    rootEl: filtersEl,
    onChange: f => {
      store.setFilter(f);
      rerender({ keepBottom: false });
    }
  });

  newBtnEl?.addEventListener('click', () => {
    toBottom(bodyEl);
    pendingNew = 0;
    newBtnEl.classList.add('hidden');
  });

  // Por defecto permitimos escribir
  puedeEscribir = true;
  updateChatPermission();


  /* ===============================
    1) HISTORY
  =============================== */

  const history = await fetchMessages({ sorteoId, token, limit: 50 });
  if (!history.ok) {
    if (history.status === 401) {
      canUseChat = false;
      updateChatPermission();
      hintEl.textContent = history.friendlyMessage || 'Sesión expirada. Inicia sesión nuevamente.';
    } else if (history.status === 403) {
      hintEl.textContent = history.friendlyMessage || 'No tienes permiso para ver este chat.';
      hintEl.style.color = '#f87171';
      puedeEscribir = false;
      updateChatPermission();
    } else if (history.status === 429) {
      hintEl.textContent = history.friendlyMessage || 'Demasiadas peticiones. Espera unos segundos.';
      hintEl.style.color = '#f59e0b';
    } else {
      hintEl.textContent = 'No se pudo cargar el chat.';
      hintEl.style.color = '#f87171';
    }
  } else {
    store.upsertMany(history.data?.messages || []);
    rerender({ keepBottom: true });
  }

  /* ===============================
    2) REALTIME
  =============================== */

  try {
    unsub = await subscribeToSorteoInserts({
      sorteoId,
      onInsert: appendMessage
    });
  } catch {
    // Sin realtime
  }

  /* ===============================
     3) SEND
  =============================== */

  async function send() {
    const text = inputEl.value.trim();
    if (!text || inputEl.disabled) return;

    sendEl.disabled = true;
    hintEl.textContent = '';

    //  chequeo previo
    if (!puedeEscribir) {
      hintEl.textContent = '🔒 No tienes permiso para escribir.';
      sendEl.disabled = false;
      return;
    }

    inputEl.value = '';

    //  SOLO aquí optimistic UI
    addOptimisticMessage(text);

    const { ok, status, data, friendlyMessage } = await postMessage({
      sorteoId,
      token,
      mensaje: text,
      isAdmin: false
    });

    if (!ok) {
      // rollback visual (realtime no llegará)
      store.removeOptimisticByUserAndText(myUsuarioId, text);

      const errText = String(data?.message || data?.error || '').toLowerCase();

      if (status === 401) {
        canUseChat = false;
        updateChatPermission();
        hintEl.textContent = friendlyMessage || 'Sesión expirada. Inicia sesión nuevamente.';
        hintEl.style.color = '#f87171';
      } else if (status === 403 && data?.code === 'participation_required') {
        hintEl.textContent = '🔒 Solo participantes con número aprobado pueden escribir.';
        puedeEscribir = false;
        updateChatPermission();
        hintEl.style.color = '#ff6b6b';
      } else if (status === 403 && errText.includes('silenc')) {
        hintEl.textContent = data?.message || data?.error || 'Has sido silenciado.';
        hintEl.style.color = '#f87171';
      } else if (status === 403) {
        hintEl.textContent = friendlyMessage || 'No tienes permiso para chatear.';
        hintEl.style.color = '#f87171';
      } else if (status === 429) {
        hintEl.textContent = friendlyMessage || data?.error || 'Demasiadas peticiones. Espera unos segundos.';
        hintEl.style.color = '#f59e0b';
      } else if (status === 404) {
        hintEl.textContent = 'Chat no disponible.';
        hintEl.style.color = '#f87171';
      } else {
        hintEl.textContent = data?.error || 'Error enviando mensaje.';
        hintEl.style.color = '#f87171';
      }

      sendEl.disabled = false;
      return;
    }

    sendEl.disabled = false;
  }


  sendEl.addEventListener('click', send);

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  // 🔊 sonido
  window.addEventListener('click', () => {
    soundEnabled = true;
  }, { once: true });

  window.addEventListener('keydown', () => {
    soundEnabled = true;
  }, { once: true });

  window.addEventListener('beforeunload', () => {
    unsub?.();
  });
  }

