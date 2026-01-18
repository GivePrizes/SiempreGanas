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
  if (!sorteoId || !token) {
    console.warn('initChat: falta sorteoId o token');
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

  /* ===============================
     UI helpers
  =============================== */

  function updateChatPermission() {
    if (inputEl) inputEl.disabled = !puedeEscribir;
    if (sendEl) sendEl.disabled = !puedeEscribir;
    if (hintEl) {
      hintEl.textContent = puedeEscribir
        ? 'Escribe tu mensaje... (máx. 120 caracteres)'
        : '🔒 Solo participantes con número aprobado pueden escribir. ¡Compra uno!';
      hintEl.style.color = puedeEscribir ? '#ccc' : '#ff6b6b';
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

    const msg = {
      id: tempId,
      mensaje: text,
      is_system: false,
      created_at: new Date().toISOString(),
      usuario: {
        id: myUsuarioId,
        nombre: 'Tú'
      },
      _optimistic: true
    };

    store.upsertMany([msg]);
    rerender({ keepBottom: true });

    return tempId;
  }

  function replaceOptimistic(realMsg) {
    store.removeOptimistic?.(myUsuarioId, realMsg.mensaje);
  }

  function appendMessage(m) {
    if (!m) return;

    // Evitar duplicados
    if (store.has(m.id)) return;

    // Si es mío, elimina el optimista
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

    if (atBottom) {
      toBottom(bodyEl);
      pendingNew = 0;
      newBtnEl?.classList.add('hidden');
    } else {
      pendingNew += 1;
      newBtnEl?.classList.remove('hidden');
      newBtnEl.textContent = `Nuevos mensajes (${pendingNew}) ↓`;
    }
  }

  /* ===============================
     Filters & buttons
  =============================== */

  bindFilters({
    rootEl: filtersEl,
    onChange: (f) => {
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
     0) CHECK PERMISO
  =============================== */

  try {
    const testResp = await fetch(getChatEndpoint(sorteoId), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensaje: '' })
    });

    if (testResp.status === 403) {
      puedeEscribir = false;
    } else if (testResp.ok || testResp.status === 400) {
      puedeEscribir = true;
    }
  } catch {
    puedeEscribir = false;
  }

  updateChatPermission();

  /* ===============================
     1) HISTORIAL
  =============================== */

  try {
    const data = await fetchMessages({ sorteoId, limit: 50 });
    store.upsertMany(data.messages || []);
    rerender({ keepBottom: true });
  } catch {
    if (hintEl) hintEl.textContent = 'No se pudo cargar el historial del chat.';
  }

  /* ===============================
     2) REALTIME
  =============================== */

  try {
    const supabase = await createRealtimeClient();

    unsub = subscribeToSorteoInserts({
      supabase,
      sorteoId,
      onInsert: (m) => appendMessage(m)
    });
  } catch (err) {
    console.error('Realtime no disponible', err);
  }

  /* ===============================
     3) SEND (CHAT REAL)
  =============================== */

  async function send() {
    const text = (inputEl?.value || '').trim();
    if (!text || !sendEl) return;

    inputEl.value = '';
    sendEl.disabled = true;
    if (hintEl) hintEl.textContent = '';

    // 🟢 Mostrar inmediatamente
    const tempId = addOptimisticMessage(text);

    const { ok, status, data } = await postMessage({
      sorteoId,
      token,
      mensaje: text
    });

    // 🔴 Error → quitar mensaje optimista
    if (!ok) {
      store.remove(tempId);
      rerender({ keepBottom: true });
      sendEl.disabled = false;

      if (status === 429 && hintEl) {
        const s = data?.remainingSeconds ?? 15;
        hintEl.textContent = `Espera ${s}s para volver a enviar.`;
      }

      return;
    }

    // 🟢 OK → realtime se encargará
    sendEl.disabled = false;
  }

  sendEl?.addEventListener('click', send);
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });

  window.addEventListener('beforeunload', () => {
    try {
      unsub?.();
    } catch {}
  });
}
