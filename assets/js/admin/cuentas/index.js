// frontend/assets/js/admin/cuentas/index.js
import { renderAcordeon } from './render.js';

const API_URL = window.API_URL || '';
const REFRESH_MS = 15000;

const elAcordeon = document.getElementById('acordeonSorteos');
const elEmpty = document.getElementById('emptyState');
const elEmptyTitle = document.getElementById('emptyTitle');
const elEmptySub = document.getElementById('emptySub');
const elQ = document.getElementById('q');
const elTipoProductoFiltro = document.getElementById('tipoProductoFiltro');
const btnRefrescar = document.getElementById('btnRefrescar');

const state = {
  filter: 'todos',       // todos | pendiente | entregada
  tipoProducto: 'todos', // todos | pantalla | combo | bonus
  q: '',
  open: new Set(),       // sorteos abiertos
  cache: [],             // raw del backend
};

async function requireCuentasAccess() {
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../index.html' })
    : null;

  if (!user) return null;

  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  const esAdmin = user?.rol === 'admin';
  const puedeCuentas = permisos.includes('cuentas:gestionar');

  if (esAdmin && !puedeCuentas) {
    alert('No tienes permisos para entrar a entrega de cuentas.');
    location.href = 'panel.html';
    return null;
  }

  if (!getToken() || !esAdmin || !puedeCuentas) {
    alert('No tienes acceso al panel de entrega de cuentas.');
    location.href = '../index.html';
    return null;
  }

  return user;
}

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

function setEmptyMessage(title, subtitle) {
  if (elEmptyTitle) {
    elEmptyTitle.textContent = title || 'No hay cuentas pendientes para mostrar';
  }
  if (elEmptySub) {
    elEmptySub.textContent = subtitle || 'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.';
  }
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
    setEmptyMessage(
      'No hay cuentas pendientes para mostrar',
      'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.'
    );
    showEmpty(!hasVisible);

    // mantener scroll (suave)
    window.scrollTo({ top: prevScroll });

  } catch (e) {
    console.error('[CUENTAS] Error:', e);
    toast(e.message || 'Error cargando cuentas');
    state.cache = [];
    renderAcordeon([], state);
    setEmptyMessage(
      'No se pudieron cargar las cuentas',
      e.message || 'Revisa la conexion o refresca el panel.'
    );
    showEmpty(true);
  } finally {
    if (!silent && btnRefrescar) {
      btnRefrescar.disabled = false;
      btnRefrescar.textContent = '🔄 Refrescar';
    }
  }
}

async function marcarEntregada(entregaId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesión expirada');

  // UX: feedback inmediato
  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {
    const response = await fetchJSON(
      `${API_URL}/api/admin/cuentas/entregas/${entregaId}/entregar`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
    );

    toast('Marcado como entregada ✅');
    const bonusReiniciado = response?.data?.bonusReiniciado === true;
    if (bonusReiniciado) {
      toast('Bonus entregado y contador reiniciado');
    }
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
    setEmptyMessage(
      'No hay cuentas pendientes para mostrar',
      'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.'
    );
    showEmpty(!hasVisible);
  });

  elTipoProductoFiltro?.addEventListener('change', () => {
    state.tipoProducto = elTipoProductoFiltro.value || 'todos';
    renderAcordeon(state.cache, state);
    const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
    setEmptyMessage(
      'No hay cuentas pendientes para mostrar',
      'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.'
    );
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
      setEmptyMessage(
        'No hay cuentas pendientes para mostrar',
        'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.'
      );
      showEmpty(!hasVisible);
    });
  });

  btnRefrescar?.addEventListener('click', () => cargarCuentas({ silent: false }));
}

function setupAcordeonToggle() {
  // Delegación: click en el header abre/cierra
  elAcordeon?.addEventListener('click', (ev) => {
    // 1) Acción "marcar entregada"
    const btnEntregar = ev.target.closest('button[data-action="entregar"][data-entrega]');
    if (btnEntregar) {
      ev.preventDefault();
      ev.stopPropagation();
      const entregaId = btnEntregar.dataset.entrega;
      marcarEntregada(entregaId, btnEntregar).catch(err => {
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
    setEmptyMessage(
      'No hay cuentas pendientes para mostrar',
      'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.'
    );
    showEmpty(!hasVisible);
  });
}

async function init() {
  const user = await requireCuentasAccess();
  if (!user) return;

  document.body.classList.remove('auth-pending');
  setupFilters();
  setupAcordeonToggle();
  cargarCuentas({ silent: false });
  setInterval(() => cargarCuentas({ silent: true }), REFRESH_MS);
}

document.addEventListener('DOMContentLoaded', init);
