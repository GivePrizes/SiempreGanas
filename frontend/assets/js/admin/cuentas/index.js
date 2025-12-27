// frontend/assets/js/admin/cuentas/index.js
import { renderAcordeon } from './render.js';

const API_URL = window.API_URL || '';
const REFRESH_MS = 15000;

const elAcordeon = document.getElementById('acordeonSorteos');
const elEmpty = document.getElementById('emptyState');
const elQ = document.getElementById('q');
const btnRefrescar = document.getElementById('btnRefrescar');

const state = {
  filter: 'todos',       // todos | pendiente | entregada
  q: '',
  open: new Set(),       // sorteos abiertos
  cache: [],             // raw del backend
};

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.add('hidden'), 1800);
}

function showEmpty(show) {
  if (!elEmpty) return;
  elEmpty.classList.toggle('hidden', !show);
}

function getToken() {
  return localStorage.getItem('token') || '';
}

async function fetchJSON(url, options = {}) {
  const r = await fetch(url, options);
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg = (data && typeof data === 'object' && data.error) ? data.error : `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

async function cargarCuentas({ silent = false } = {}) {
  const token = getToken();
  if (!token) {
    toast('Sesión expirada. Inicia sesión.');
    return;
  }

  const prevScroll = window.scrollY;
  if (!silent && btnRefrescar) {
    btnRefrescar.disabled = true;
    btnRefrescar.textContent = 'Actualizando...';
  }

  try {
    const raw = await fetchJSON(`${API_URL}/api/admin/cuentas/sorteos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    state.cache = Array.isArray(raw) ? raw : [];

    // Render con estado UI (filtro + búsqueda + abiertos)
    renderAcordeon(state.cache, state);

    // Empty si no hay nada (o si filtros dejan todo vacío)
    const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
    showEmpty(!hasVisible);

    // mantener scroll (suave)
    window.scrollTo({ top: prevScroll });

  } catch (e) {
    console.error('[CUENTAS] Error:', e);
    toast(e.message || 'Error cargando cuentas');
    state.cache = [];
    renderAcordeon([], state);
    showEmpty(true);
  } finally {
    if (!silent && btnRefrescar) {
      btnRefrescar.disabled = false;
      btnRefrescar.textContent = '🔄 Refrescar';
    }
  }
}

async function marcarEntregada(sorteoId, usuarioId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesión expirada');

  // UX: feedback inmediato
  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {
    await fetchJSON(
      `${API_URL}/api/admin/cuentas/sorteos/${sorteoId}/usuarios/${usuarioId}/entregar`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
    );

    toast('Marcado como entregada ✅');
    await cargarCuentas({ silent: true });

  } finally {
    if (btn) {
      // si quedó entregada, el render la deshabilita igual, pero devolvemos texto por si falla el refresh
      btn.textContent = oldText || 'Marcar entregada';
    }
  }
}

function setupFilters() {
  // búsqueda
  elQ?.addEventListener('input', () => {
    state.q = elQ.value || '';
    renderAcordeon(state.cache, state);
    const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
    showEmpty(!hasVisible);
  });

  // chips
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.dataset.filter || 'todos';

      renderAcordeon(state.cache, state);
      const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
      showEmpty(!hasVisible);
    });
  });

  btnRefrescar?.addEventListener('click', () => cargarCuentas({ silent: false }));
}

function setupAcordeonToggle() {
  // Delegación: click en el header abre/cierra
  elAcordeon?.addEventListener('click', (ev) => {
    // 1) Acción "marcar entregada"
    const btnEntregar = ev.target.closest('button[data-action="entregar"][data-sorteo][data-user]');
    if (btnEntregar) {
      ev.preventDefault();
      ev.stopPropagation();
      const sorteoId = btnEntregar.dataset.sorteo;
      const usuarioId = btnEntregar.dataset.user;
      marcarEntregada(sorteoId, usuarioId, btnEntregar).catch(err => {
        console.error(err);
        toast(err.message || 'No se pudo marcar');
        btnEntregar.disabled = false;
        btnEntregar.textContent = 'Marcar entregada';
      });
      return;
    }

    // 2) Toggle acordeón (click en .ac-head)
    const head = ev.target.closest('.ac-head[data-sorteo-id]');
    if (!head) return;

    const id = String(head.dataset.sorteoId);
    if (state.open.has(id)) state.open.delete(id);
    else state.open.add(id);

    renderAcordeon(state.cache, state);

    // Mantener empty correcto
    const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
    showEmpty(!hasVisible);
  });
}

function init() {
  setupFilters();
  setupAcordeonToggle();
  cargarCuentas({ silent: false });
  setInterval(() => cargarCuentas({ silent: true }), REFRESH_MS);
}

document.addEventListener('DOMContentLoaded', init);
