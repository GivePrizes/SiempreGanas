import { fetchMessages, postMessage } from './chatApi.js';
import { createChatStore } from './store.js';
import { bindFilters, renderMessages, isBottom, toBottom } from './ui.js';
import { getChatEndpoint } from './config.js';
import { subscribeToSorteoInserts } from './realtime.js';

/* ===============================
   Utils
=============================== */

/**
 * Extrae el usuario_id SIN IMPORTAR
 * si viene como:
 *  - m.usuario_id        (Realtime)
 *  - m.usuario.id       (History / API)
 *
 * 👉 ESTA FUNCIÓN ES LA CLAVE DEL FIX
 */
function getMensajeUsuarioId(m) {
  return m?.usuario_id ?? m?.usuario?.id ?? null;
}

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
  if (!sorteoId || !token) return;

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

  /* ===============================
     UI helpers
  =============================== */

  function updateChatPermission() {
    inputEl.disabled = !puedeEscribir;
    sendEl.disabled = !puedeEscribir;

    if (!hintEl) return;

    if (puedeEscribir) {
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

    const msgUserId = getMensajeUsuarioId(m);

    // 👇 Si el mensaje es mío, reemplaza el optimista
    if (Number(msgUserId) === Number(myUsuarioId)) {
      replaceOptimistic(m);
    }

    const atBottom = isBottom(bodyEl);
    store.upsertMany([m]);

    renderMessages({
      containerEl: bodyEl,
      messages: store.getFiltered(),
      myUsuarioId
    });

    // 🔔 Sonido SOLO si NO es mío
    if (!m.is_system && Number(msgUserId) !== Number(myUsuarioId)) {
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

  /* ===============================
    0) CHECK PERMISSION
  =============================== */

  try {
    const resp = await fetch(getChatEndpoint(sorteoId), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    puedeEscribir = resp.ok;
  } catch {
    puedeEscribir = false;
  }

  updateChatPermission();

  /* ===============================
    1) HISTORY
  =============================== */

  try {
    const data = await fetchMessages({ sorteoId, limit: 50 });
    store.upsertMany(data.messages || []);
    rerender({ keepBottom: true });
  } catch {
    hintEl.textContent = 'No se pudo cargar el chat.';
  }

  /* ===============================
    2) REALTIME
  =============================== */

  try {
    unsub = await subscribeToSorteoInserts({
      sorteoId,
      onInsert: appendMessage
    });
  } catch (e) {
    console.error('❌ Error realtime', e);
  }

  /* ===============================
     3) SEND
  =============================== */

  async function send() {
    const text = inputEl.value.trim();
    if (!text || inputEl.disabled) return;

    inputEl.value = '';
    sendEl.disabled = true;
    hintEl.textContent = '';

    addOptimisticMessage(text);

    const { ok, status, data } = await postMessage({
      sorteoId,
      token,
      mensaje: text
    });

    if (!ok) {
      // manejo de errores intacto
      sendEl.disabled = false;
      return;
    }

    sendEl.disabled = false;
  }

  sendEl.addEventListener('click', send);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') send();
  });

  // 🔊 habilita sonido tras interacción real
  window.addEventListener('click', () => soundEnabled = true, { once: true });
  window.addEventListener('keydown', () => soundEnabled = true, { once: true });

  window.addEventListener('beforeunload', () => {
    unsub?.();
  });
}
