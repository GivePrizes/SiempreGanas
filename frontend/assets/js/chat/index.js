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

  const bodyEl    = document.getElementById('chatBody');
  const inputEl   = document.getElementById('chatInput');
  const sendEl    = document.getElementById('chatSend');
  const hintEl    = document.getElementById('chatHint');
  const filtersEl = document.getElementById('chatFilters');
  const newBtnEl  = document.getElementById('chatNewBtn');

  const store = createChatStore({ myUsuarioId });
  let pendingNew = 0;

  let puedeEscribir = false; // por defecto no, hasta confirmar

  // Función para actualizar UI según permiso
  function updateChatPermission() {
    if (inputEl)  inputEl.disabled  = !puedeEscribir;
    if (sendEl)   sendEl.disabled   = !puedeEscribir;
    if (hintEl) {
      hintEl.textContent = puedeEscribir
        ? 'Escribe tu mensaje... (máx. 120 caracteres)'
        : '🔒 Solo participantes con número aprobado pueden escribir. ¡Compra uno!';
      hintEl.style.color = puedeEscribir ? '#ccc' : '#ff6b6b';
    }
  }

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
    onChange: (f) => { store.setFilter(f); rerender({ keepBottom: false }); }
  });

  newBtnEl?.addEventListener('click', () => {
    toBottom(bodyEl);
    pendingNew = 0;
    newBtnEl.classList.add('hidden');
  });

  // 0) CHEQUEO DE PERMISO (POST vacío como prueba)
  try {
    const testResp = await fetch(`${CHAT_SERVICE_URL}/${sorteoId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensaje: '' }) // vacío para no insertar nada
    });

    if (testResp.status === 403) {
      puedeEscribir = false;
    } else if (testResp.ok || testResp.status === 400) { // 400 por validación vacía es OK
      puedeEscribir = true;
    }
  } catch (err) {
    console.warn('No se pudo verificar permiso de chat', err);
    puedeEscribir = false; // conservador
  }

  updateChatPermission();

  // 1) HISTORIAL
  try {
    const data = await fetchMessages({ sorteoId, limit: 50 });
    store.upsertMany(data.messages || []);
    rerender({ keepBottom: true });
  } catch {
    if (hintEl) hintEl.textContent = 'No se pudo cargar el historial del chat.';
  }

  // 2) LIVE (Realtime + fallback polling)
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
        rerender({ keepBottom: true });
      }
    });
  } catch {
    setInterval(async () => {
      try {
        const data = await fetchMessages({ sorteoId, limit: 30 });
        store.upsertMany(data.messages || []);
        rerender({ keepBottom: true });
      } catch {}
    }, 3000);
  }

  // 3) SEND (ya protegido por backend)
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
  }

  sendEl?.addEventListener('click', send);
  inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  window.addEventListener('beforeunload', () => { try { unsub?.(); } catch {} });
}