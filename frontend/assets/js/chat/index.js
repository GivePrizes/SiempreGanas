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

  const debugChat =
    window?.DEBUG_CHAT ||
    localStorage.getItem('DEBUG_CHAT') === '1' ||
    new URLSearchParams(window.location.search).get('debugChat') === '1';

  const logDebug = (...args) => {
    if (debugChat) console.log('[chat]', ...args);
  };

  const myUsuarioId = usuarioIdFromToken(token);

  logDebug('initChat', { sorteoId, myUsuarioId, debugChat });

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
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
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
      usuario: { id: myUsuarioId, alias: 'Tú', nombre: 'Tú' },
      _optimistic: true
    }]);

    rerender({ keepBottom: true });
    return tempId;
  }

  function replaceOptimistic(realMsg) {
    const optimistic = store.removeOptimisticByUserAndText(
      myUsuarioId,
      realMsg.mensaje
    );
    if (optimistic?.usuario && realMsg?.usuario) {
      if (!realMsg.usuario.alias) realMsg.usuario.alias = optimistic.usuario.alias;
      if (!realMsg.usuario.nombre) realMsg.usuario.nombre = optimistic.usuario.nombre;
    }
  }

  /* ===============================
     Append realtime message
  =============================== */

  function appendMessage(m) {
    if (!m || store.has(m.id)) return;

    logDebug('realtime raw message', m);

    // 🔥 NORMALIZAR MENSAJE REALTIME
    const alias =
      m.usuario?.alias ??
      m.usuario_alias ??
      (m.usuario_id === myUsuarioId ? 'Tú' : null);
    const nombre =
      m.usuario?.nombre ??
      m.usuario_nombre ??
      (m.usuario_id === myUsuarioId ? 'Tú' : 'Usuario');

    const mensaje = {
      ...m,
      usuario_id: m.usuario_id ?? m.usuario?.id ?? m.usuarioId ?? null,
      usuario: {
        id: m.usuario_id ?? m.usuario?.id ?? m.usuarioId ?? null,
        alias,
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
  logDebug('history response', history);
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
    logDebug('realtime subscribed');
  } catch {
    // Sin realtime
    logDebug('realtime subscribe failed');
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

    logDebug('postMessage response', { ok, status, data });

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

    const payloadMessage =
      (data && (data.message || data.mensaje || data.data)) ||
      (data && data.id ? data : null);

    if (payloadMessage && payloadMessage.id) {
      const normalized = {
        ...payloadMessage,
        usuario_id:
          payloadMessage.usuario_id ??
          payloadMessage.usuario?.id ??
          payloadMessage.usuarioId ??
          myUsuarioId,
        usuario: {
          id:
            payloadMessage.usuario?.id ??
            payloadMessage.usuario_id ??
            payloadMessage.usuarioId ??
            myUsuarioId,
          alias:
            payloadMessage.usuario?.alias ??
            payloadMessage.usuario_alias ??
            'Tú',
          nombre:
            payloadMessage.usuario?.nombre ??
            payloadMessage.usuario_nombre ??
            'Tú'
        }
      };

      replaceOptimistic(normalized);
      store.upsertMany([normalized]);
      rerender({ keepBottom: true });
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

