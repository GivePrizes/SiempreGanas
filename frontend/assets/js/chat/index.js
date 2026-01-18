// frontend/assets/js/chat/index.js
import { fetchMessages, postMessage } from './chatApi.js';
import { createRealtimeClient, subscribeToSorteoInserts } from './realtime.js';
import { createChatStore } from './store.js';
import { bindFilters, renderMessages, isBottom, toBottom } from './ui.js';
import { getChatEndpoint } from './config.js';

/* ===============================
   Utils
=============================== */

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
    store.removeOptimistic?.(myUsuarioId, realMsg.mensaje);
  }

  /* ===============================
     Append realtime message
  =============================== */

  function appendMessage(m) {
    if (!m || store.has(m.id)) return;

    if (Number(m.usuario?.id) === Number(myUsuarioId)) {
      replaceOptimistic(m);
    }

    const atBottom = isBottom(bodyEl);
    store.upsertMany([m]);

    renderMessages({
      containerEl: bodyEl,
      messages: store.getFiltered(),
      myUsuarioId
    });

    if (!m.is_system && Number(m.usuario?.id) !== Number(myUsuarioId)) {
      playPing?.();
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
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensaje: '' })
    });

    puedeEscribir = resp.ok || resp.status === 400;
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
    const supabase = await createRealtimeClient();
    unsub = subscribeToSorteoInserts({
      supabase,
      sorteoId,
      onInsert: appendMessage
    });
  } catch {}

  /* ===============================
     3) SEND
  =============================== */

  async function send() {
    const text = inputEl.value.trim();
    if (!text || inputEl.disabled) return;

    inputEl.value = '';
    sendEl.disabled = true;
    hintEl.textContent = '';

    const tempId = addOptimisticMessage(text);

    const { ok, status, data } = await postMessage({
      sorteoId,
      token,
      mensaje: text
    });

    if (!ok) {
      store.remove(tempId);
      rerender({ keepBottom: true });

      // 🔇 MUTE
      if (status === 403 && data?.remainingSeconds) {
        const mins = Math.ceil(data.remainingSeconds / 60);
        hintEl.textContent = `🔇 Estás silenciado por ${mins} min`;
        hintEl.style.color = '#f87171';

        inputEl.disabled = true;
        sendEl.disabled = true;

        setTimeout(() => {
          if (!puedeEscribir) return;
          inputEl.disabled = false;
          sendEl.disabled = false;
          hintEl.textContent = '';
          hintEl.style.color = '';
        }, data.remainingSeconds * 1000);

        return;
      }

      // 🔒 NO PERMISO
      if (status === 403) {
        hintEl.textContent =
          '🔒 No tienes permiso para escribir en este chat';
        hintEl.style.color = '#ff6b6b';
      }

      // ⏱️ COOLDOWN
      if (status === 429) {
        hintEl.textContent =
          `Espera ${data?.remainingSeconds ?? 15}s para volver a enviar.`;
      }

      sendEl.disabled = false;
      return;
    }

    sendEl.disabled = false;
  }

  sendEl.addEventListener('click', send);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') send();
  });

  window.addEventListener('beforeunload', () => {
    unsub?.();
  });
}
