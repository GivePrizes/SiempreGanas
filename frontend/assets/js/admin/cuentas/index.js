// frontend/assets/js/admin/cuentas/index.js
import { renderAcordeon } from './render.js';

const API_URL = window.API_URL || '';

async function getJSON(url, token, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // intenta leer respuesta
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!r.ok) {
    const msg = typeof data === 'object' && data?.error ? data.error : `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

function showEmptyState(show) {
  const empty = document.getElementById('emptyState');
  if (!empty) return;
  empty.classList.toggle('hidden', !show);
}

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

export async function cargarCuentas() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No hay token');
    toast('Sesión expirada. Inicia sesión.');
    return;
  }

  try {
    const raw = await getJSON(`${API_URL}/api/admin/cuentas/sorteos`, token);
    renderAcordeon(raw);
    showEmptyState(!raw || raw.length === 0);
  } catch (e) {
    console.error('Error cargando cuentas:', e);
    renderAcordeon([]); // limpia
    showEmptyState(true);
    toast(e.message || 'Error cargando cuentas');
  }
}

async function marcarEntregada(sorteoId, usuarioId) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Sesión expirada');

  // Endpoint confirmado que existe en tu backend:
  // PATCH /api/admin/cuentas/sorteos/:sorteoId/usuarios/:usuarioId/entregar
  return getJSON(
    `${API_URL}/api/admin/cuentas/sorteos/${sorteoId}/usuarios/${usuarioId}/entregar`,
    token,
    { method: 'PATCH' }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  // 1) carga inicial
  cargarCuentas();

  // 2) botón refrescar
  const btnRef = document.getElementById('btnRefrescar');
  if (btnRef) btnRef.addEventListener('click', cargarCuentas);

  // 3) delegación para botones "Marcar entregada"
  const cont = document.getElementById('acordeonSorteos');
  if (cont) {
    cont.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-sorteo][data-user]');
      if (!btn) return;

      const sorteoId = btn.dataset.sorteo;
      const usuarioId = btn.dataset.user;

      // UX: feedback inmediato
      const oldText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Marcando...';

      try {
        await marcarEntregada(sorteoId, usuarioId);
        toast('Marcada como entregada ✅');
        await cargarCuentas(); // refresca lista y contadores
      } catch (e) {
        console.error('Error marcando entregada:', e);
        toast(e.message || 'No se pudo marcar');
      } finally {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    });
  }
});
