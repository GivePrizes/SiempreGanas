import { initChat } from '../chat/index.js';

const API_URL = window.API_URL || '';
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('id') || params.get('sorteo') || params.get('sorteoId');
const token = localStorage.getItem('token') || '';

const btnBackToSorteo = document.getElementById('btnBackToSorteo');
const titleEl = document.getElementById('chatOnlineTitle');
const stateEl = document.getElementById('chatStateText');
const inputEl = document.getElementById('chatInput');
const sendEl = document.getElementById('chatSend');
const hintEl = document.getElementById('chatHint');

function setWriteEnabled(enabled, hintText = '') {
  if (inputEl) inputEl.disabled = !enabled;
  if (sendEl) sendEl.disabled = !enabled;
  if (hintEl && hintText) hintEl.textContent = hintText;
}

function goLogin() {
  window.location.href = '../login.html';
}

if (btnBackToSorteo) {
  btnBackToSorteo.addEventListener('click', () => {
    if (!sorteoId) {
      window.location.href = 'dashboard.html';
      return;
    }
    window.location.href = `sorteo.html?id=${encodeURIComponent(sorteoId)}`;
  });
}

async function main() {
  if (!token) {
    goLogin();
    return;
  }

  if (!sorteoId) {
    if (titleEl) titleEl.textContent = 'Chat online';
    if (stateEl) stateEl.textContent = 'Falta id de sorteo en la URL.';
    setWriteEnabled(false, 'Abre la sala desde una ronda válida.');
    return;
  }

  if (stateEl) stateEl.textContent = `Sorteo #${sorteoId}`;

  try {
    const res = await fetch(`${API_URL}/api/sorteos/${encodeURIComponent(sorteoId)}`);
    if (res.ok) {
      const data = await res.json();
      if (titleEl) titleEl.textContent = `Chat online · ${data.descripcion || `Sorteo #${sorteoId}`}`;
      if (stateEl) stateEl.textContent = 'Conectado en tiempo real';
    }
  } catch {}

  try {
    await initChat({ sorteoId, token });
  } catch {
    setWriteEnabled(false, 'No se pudo cargar el chat. Recarga la página.');
  }

  try {
    const res = await fetch(
      `${API_URL}/api/participante/mis-numeros?sorteoId=${encodeURIComponent(sorteoId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.ok) {
      const data = await res.json();
      const nums = Array.isArray(data?.numeros) ? data.numeros : [];

      if (!nums.length) {
        setWriteEnabled(false, '🔒 Solo participantes aprobados pueden escribir.');
      } else {
        setWriteEnabled(true);
      }
    }
  } catch {}
}

main();
