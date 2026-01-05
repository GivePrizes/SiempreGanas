// frontend/assets/js/chat/index.js
import { fetchMessages, postMessage } from './chatApi.js';
import { createRealtimeClient, subscribeToSorteoInserts } from './realtime.js';
import { createChatStore } from './store.js';
import { bindFilters, renderMessages, isBottom, toBottom } from './ui.js';

function usuarioIdFromToken(token){
  try { return JSON.parse(atob(token.split('.')[1]))?.id ?? null; } catch { return null; }
}

export async function initChat({ sorteoId, token }) {
  const myUsuarioId = usuarioIdFromToken(token);

  const bodyEl = document.getElementById('chatBody');
  const inputEl = document.getElementById('chatInput');
  const sendEl = document.getElementById('chatSend');
  const hintEl = document.getElementById('chatHint');
  const filtersEl = document.getElementById('chatFilters');
  const newBtnEl = document.getElementById('chatNewBtn');

  const store = createChatStore({ myUsuarioId });
  let pendingNew = 0;

  function rerender({ keepBottom = true } = {}) {
    const atBottom = isBottom(bodyEl);
    renderMessages({ containerEl: bodyEl, messages: store.getFiltered(), myUsuarioId });

    if (keepBottom && atBottom) {
      toBottom(bodyEl);
      pendingNew = 0;
      newBtnEl?.classList.add('hidden');
    } else if (pendingNew > 0) {
      newBtnEl?.classList.remove('hidden');
      newBtnEl.textContent = `Nuevos mensajes (${pendingNew}) ↓`;
    }
  }

  bindFilters({
    rootEl: filtersEl,
    onChange: (f) => { store.setFilter(f); rerender({ keepBottom:false }); }
  });

  newBtnEl?.addEventListener('click', () => {
    toBottom(bodyEl);
    pendingNew = 0;
    newBtnEl.classList.add('hidden');
  });

  // 1) HISTORIAL por chat-service
  try {
    const data = await fetchMessages({ sorteoId, limit: 50 });
    store.upsertMany(data.messages || []);
    rerender({ keepBottom:true });
  } catch {
    if (hintEl) hintEl.textContent = 'No se pudo cargar el historial del chat.';
  }

  // 2) LIVE por Realtime (con fallback a polling)
  let unsub = null;
  try {
    const supabase = await createRealtimeClient();
    unsub = subscribeToSorteoInserts({
      supabase,
      sorteoId,
      onInsert: (m) => {
        const atBottom = isBottom(bodyEl);
        store.upsertMany([m]);
        if (!atBottom) pendingNew += 1;
        rerender({ keepBottom:true });
      }
    });
  } catch {
    // fallback: polling liviano
    setInterval(async () => {
      try {
        const data = await fetchMessages({ sorteoId, limit: 30 });
        store.upsertMany(data.messages || []);
        rerender({ keepBottom:true });
      } catch {}
    }, 3000);
  }

  // 3) SEND por chat-service (respeta 429)
  async function send() {
    const msg = (inputEl?.value || '').trim();
    if (!msg || !sendEl) return;

    sendEl.disabled = true;
    if (hintEl) hintEl.textContent = '';

    const { ok, status, data } = await postMessage({ sorteoId, token, mensaje: msg });

    if (status === 429) {
      const s = data?.remainingSeconds ?? 15;
      if (hintEl) hintEl.textContent = `Espera ${s}s para volver a enviar.`;
      setTimeout(() => { sendEl.disabled = false; }, s * 1000);
      return;
    }

    if (!ok) {
      if (hintEl) hintEl.textContent = data?.message || data?.error || 'No se pudo enviar.';
      sendEl.disabled = false;
      return;
    }

    if (inputEl) inputEl.value = '';
    sendEl.disabled = false;
    // No añadimos manual; llega por Realtime
  }

  sendEl?.addEventListener('click', send);
  inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  window.addEventListener('beforeunload', () => { try { unsub?.(); } catch {} });
}
