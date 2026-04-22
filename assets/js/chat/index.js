//chat/index.js
import { fetchMessages, normalizeChatMessage, postMessage } from './chatApi.js?v=20260329b';
import { createChatStore } from './store.js?v=20260329b';
import { bindFilters, renderMessages, isBottom, toBottom } from './ui.js?v=20260329b';
import { subscribeToSorteoInserts } from './realtime.js?v=20260329b';

const CHAT_SYNC_VISIBLE_MS = 25000;
const CHAT_SYNC_HIDDEN_MS = 60000;
const CHAT_STREAM_RECOVERY_MS = 2200;
const CHAT_MAX_BACKOFF_MS = 60000;

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

function getChatSyncJitterMs(baseDelay) {
  if (baseDelay >= 60000) return Math.floor(Math.random() * 2200);
  if (baseDelay >= 25000) return Math.floor(Math.random() * 1400);
  if (baseDelay >= 10000) return Math.floor(Math.random() * 700);
  return Math.floor(Math.random() * 150);
}

/* ===============================
   Init
=============================== */

export async function initChat({ sorteoId, token }) {
  if (!sorteoId || !token) return;

  const myUsuarioId = usuarioIdFromToken(token);

  const bodyEl    = document.getElementById('chatBody');
  const inputEl   = document.getElementById('chatInput');
  const sendEl    = document.getElementById('chatSend');
  const hintEl    = document.getElementById('chatHint');
  const filtersEl = document.getElementById('chatFilters');
  const newBtnEl  = document.getElementById('chatNewBtn');

  if (!bodyEl || !inputEl || !sendEl || !hintEl) return;

  const store = createChatStore({ myUsuarioId });

  let pendingNew = 0;
  let puedeEscribir = false;
  let unsub = null;
  let soundEnabled = false;
  let syncTimer = null;
  let syncInFlight = false;
  let disposed = false;
  let syncErrorCount = 0;

  /* ===============================
     UI helpers
  =============================== */

  function updateChatPermission() {
    if (inputEl) inputEl.disabled = !puedeEscribir;
    if (sendEl) sendEl.disabled = !puedeEscribir;

    if (!hintEl) return;

    if (puedeEscribir) {
      hintEl.textContent = 'Escribe tu mensaje... (máx. 120 caracteres)';
      hintEl.style.color = '#ccc';
    } else {
      hintEl.textContent =
        '🔒 Solo quienes tengan una participacion aprobada pueden escribir.';
      hintEl.style.color = '#ff6b6b';
    }
  }

  window.setParticipantChatPermission = function setParticipantChatPermission({
    canWrite,
    message,
  } = {}) {
    if (typeof canWrite === 'boolean') {
      puedeEscribir = canWrite;
      updateChatPermission();
    }

    if (hintEl && typeof message === 'string') {
      hintEl.textContent = message;
    }
  };

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
    const mensaje = normalizeChatMessage(m);
    if (!mensaje || store.has(mensaje.id)) return;

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
      newBtnEl.textContent = `Nuevos mensajes (${pendingNew}) ↓`;
    }
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
    const safeDelay = Math.max(500, Number(delay) || getSyncDelay());
    syncTimer = setTimeout(() => {
      syncLatestMessages();
    }, safeDelay + getChatSyncJitterMs(safeDelay));
  }

  async function syncLatestMessages() {
    if (disposed || syncInFlight) {
      return;
    }

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
      console.error('chat fallback sync error:', err);
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

  // Arranca bloqueado hasta que otra capa resuelva permiso real
  puedeEscribir = false;
  updateChatPermission();


  /* ===============================
    1) HISTORY
  =============================== */

  try {
    const data = await fetchMessages({ sorteoId, token, limit: 50 });
    store.upsertMany(data.messages || []);
    rerender({ keepBottom: true });
  } catch {
    if (hintEl) hintEl.textContent = 'No se pudo cargar el chat.';
  }

  /* ===============================
    2) REALTIME
  =============================== */

  try {
    unsub = await subscribeToSorteoInserts({
      sorteoId,
      token,
      onInsert: appendMessage
    });
  } catch (e) {
    console.error('❌ Error realtime', e);
  }

  scheduleSync();

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

    const { ok, status, data } = await postMessage({
      sorteoId,
      token,
      mensaje: text
    });

    if (!ok) {
      // rollback visual (realtime no llegará)
      store.removeOptimisticByUserAndText(myUsuarioId, text);

      const errText = String(data?.message || data?.error || '').toLowerCase();

      if (status === 403 && data?.code === 'participation_required') {
        hintEl.textContent = '🔒 Solo quienes tengan una participacion aprobada pueden escribir.';
        puedeEscribir = false;
        updateChatPermission();
        hintEl.style.color = '#ff6b6b';
      } else if (status === 403 && errText.includes('silenc')) {
        hintEl.textContent = data?.message || data?.error || 'Has sido silenciado.';
        hintEl.style.color = '#f87171';
      } else if (status === 429) {
        hintEl.textContent = data?.error || 'Demasiadas peticiones. Espera unos segundos.';
        hintEl.style.color = '#f59e0b';
      } else if (status === 404) {
        hintEl.textContent = 'Chat no disponible.';
        hintEl.style.color = '#f87171';
      } else {
        console.error('postMessage failed', status, data);
        hintEl.textContent = data?.error || 'Error enviando mensaje.';
        hintEl.style.color = '#f87171';
      }

      sendEl.disabled = false;
      return;
    }

    if (data?.id) {
      appendMessage(data);
    } else if (data?.message?.id) {
      appendMessage(data.message);
    } else {
      scheduleSync(CHAT_STREAM_RECOVERY_MS);
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

  window.addEventListener('chat-stream-unavailable', handleStreamUnavailable);
  document.addEventListener('visibilitychange', handleVisibilityRefresh);
  window.addEventListener('focus', handleVisibilityRefresh);

  window.addEventListener('beforeunload', () => {
    disposed = true;
    if (syncTimer) clearTimeout(syncTimer);
    unsub?.();
    if (window.setParticipantChatPermission) {
      delete window.setParticipantChatPermission;
    }
    window.removeEventListener('chat-stream-unavailable', handleStreamUnavailable);
    document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    window.removeEventListener('focus', handleVisibilityRefresh);
  });
}

