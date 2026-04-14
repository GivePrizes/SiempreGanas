import { renderAcordeon } from './render.js?v=20260414a';

const API_URL = window.API_URL || '';
const REFRESH_MS = 15000;

const elAcordeon = document.getElementById('acordeonSorteos');
const elEmpty = document.getElementById('emptyState');
const elEmptyTitle = document.getElementById('emptyTitle');
const elEmptySub = document.getElementById('emptySub');
const elQ = document.getElementById('q');
const elTipoProductoFiltro = document.getElementById('tipoProductoFiltro');
const btnRefrescar = document.getElementById('btnRefrescar');

const liveOpModal = document.getElementById('liveOperacionModal');
const liveOpModalSub = document.getElementById('liveOperacionModalSub');
const liveOpForm = document.getElementById('liveOperacionForm');
const liveOpSorteoId = document.getElementById('liveOperacionSorteoId');
const liveOpUsuarioId = document.getElementById('liveOperacionUsuarioId');
const liveOpTipo = document.getElementById('liveOperacionTipo');
const liveOpMonto = document.getElementById('liveOperacionMonto');
const liveOpDescripcion = document.getElementById('liveOperacionDescripcion');
const liveOpSubmit = document.getElementById('liveOperacionSubmit');

const state = {
  filter: 'todos',
  tipoProducto: 'todos',
  q: '',
  open: new Set(),
  cache: [],
};

function getToken() {
  return localStorage.getItem('token') || '';
}

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

function refreshEmptyStateCopy() {
  const subtitle = state.tipoProducto === 'live'
    ? 'Cuando apruebes pagos en sorteos Live, apareceran aqui los beneficios de entrada y pagos Live pendientes.'
    : 'Cuando apruebes pagos o se desbloquee un bonus, apareceran aqui como pendientes.';

  setEmptyMessage('No hay cuentas pendientes para mostrar', subtitle);
}

async function fetchJSON(url, options = {}) {
  const r = await fetch(url, options);
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!r.ok) {
    const msg = (data && typeof data === 'object' && data.error) ? data.error : `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data;
}

async function cargarCuentas({ silent = false } = {}) {
  const token = getToken();
  if (!token) {
    toast('Sesion expirada. Inicia sesion.');
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
    renderAcordeon(state.cache, state);

    const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
    refreshEmptyStateCopy();
    showEmpty(!hasVisible);

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
      btnRefrescar.textContent = 'Refrescar';
    }
  }
}

async function marcarEntregada(entregaId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesion expirada');

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

    toast('Marcado como entregada');
    if (response?.data?.bonusReiniciado === true) {
      toast('Bonus entregado y contador reiniciado');
    }
    await cargarCuentas({ silent: true });
  } finally {
    if (btn) {
      btn.textContent = oldText || 'Marcar entregada';
    }
  }
}

async function completarLiveOperacion(operacionId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesion expirada');

  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {
    await fetchJSON(
      `${API_URL}/api/admin/cuentas/live-operaciones/${operacionId}/completar`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
    );

    toast('Operacion Live marcada como completada');
    await cargarCuentas({ silent: true });
  } finally {
    if (btn) {
      btn.textContent = oldText || 'Marcar completada';
    }
  }
}

function rerenderAndRefreshEmpty() {
  renderAcordeon(state.cache, state);
  const hasVisible = !!(elAcordeon && elAcordeon.children && elAcordeon.children.length);
  refreshEmptyStateCopy();
  showEmpty(!hasVisible);
}

function getLiveOperationDefaultDescription(tipo) {
  if (tipo === 'referido') return 'Pago por referidos aprobados en el Live.';
  if (tipo === 'premio_efectivo') return 'Pago de premio en efectivo del sorteo Live.';
  if (tipo === 'premio_extra') return 'Entrega o compensacion por premio extra del Live.';
  return 'Ajuste manual del sorteo Live.';
}

function openLiveOperacionModal(trigger) {
  if (!liveOpModal || !liveOpForm) return;

  const sorteoId = trigger?.dataset?.sorteo || '';
  const usuarioId = trigger?.dataset?.usuario || '';
  const nombre = trigger?.dataset?.nombre || '';
  const sorteoDesc = trigger?.dataset?.sorteoDesc || '';

  liveOpSorteoId.value = sorteoId;
  liveOpUsuarioId.value = usuarioId;
  liveOpTipo.value = 'referido';
  liveOpMonto.value = '';
  liveOpDescripcion.value = getLiveOperationDefaultDescription('referido');

  if (liveOpModalSub) {
    liveOpModalSub.textContent = nombre
      ? `Vas a registrar una operacion Live para ${nombre} en ${sorteoDesc || 'este sorteo'}.`
      : 'Deja listo un pago de referido o premio para operarlo desde admin cuentas.';
  }

  liveOpModal.classList.remove('hidden');
  liveOpModal.setAttribute('aria-hidden', 'false');
}

function closeLiveOperacionModal() {
  if (!liveOpModal || !liveOpForm) return;
  liveOpModal.classList.add('hidden');
  liveOpModal.setAttribute('aria-hidden', 'true');
  liveOpForm.reset();
}

async function submitLiveOperacionForm(event) {
  event.preventDefault();

  const token = getToken();
  if (!token) {
    toast('Sesion expirada. Inicia sesion.');
    return;
  }

  const payload = {
    sorteo_id: liveOpSorteoId.value,
    usuario_id: liveOpUsuarioId.value,
    tipo: liveOpTipo.value,
    monto: liveOpMonto.value,
    descripcion: liveOpDescripcion.value.trim(),
    metadata: {},
  };

  if (!payload.sorteo_id || !payload.usuario_id || !payload.tipo || !payload.descripcion) {
    toast('Completa los datos basicos de la operacion Live.');
    return;
  }

  const oldText = liveOpSubmit?.textContent || 'Guardar operacion';
  if (liveOpSubmit) {
    liveOpSubmit.disabled = true;
    liveOpSubmit.textContent = 'Guardando...';
  }

  try {
    await fetchJSON(`${API_URL}/api/admin/cuentas/live-operaciones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    toast('Operacion Live creada');
    closeLiveOperacionModal();
    await cargarCuentas({ silent: true });
  } catch (err) {
    console.error(err);
    toast(err.message || 'No se pudo crear la operacion Live');
  } finally {
    if (liveOpSubmit) {
      liveOpSubmit.disabled = false;
      liveOpSubmit.textContent = oldText;
    }
  }
}

function setupFilters() {
  elQ?.addEventListener('input', () => {
    state.q = elQ.value || '';
    rerenderAndRefreshEmpty();
  });

  elTipoProductoFiltro?.addEventListener('change', () => {
    state.tipoProducto = elTipoProductoFiltro.value || 'todos';
    rerenderAndRefreshEmpty();
  });

  const chips = document.querySelectorAll('.chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.dataset.filter || 'todos';
      rerenderAndRefreshEmpty();
    });
  });

  btnRefrescar?.addEventListener('click', () => cargarCuentas({ silent: false }));
}

function setupAcordeonToggle() {
  elAcordeon?.addEventListener('click', (ev) => {
    const btnEntregar = ev.target.closest('button[data-action="entregar"][data-entrega]');
    if (btnEntregar) {
      ev.preventDefault();
      ev.stopPropagation();
      const entregaId = btnEntregar.dataset.entrega;
      marcarEntregada(entregaId, btnEntregar).catch((err) => {
        console.error(err);
        toast(err.message || 'No se pudo marcar');
        btnEntregar.disabled = false;
        btnEntregar.textContent = 'Marcar entregada';
      });
      return;
    }

    const btnLiveOp = ev.target.closest('button[data-action="crear-live-op"]');
    if (btnLiveOp) {
      ev.preventDefault();
      ev.stopPropagation();
      openLiveOperacionModal(btnLiveOp);
      return;
    }

    const btnCompletarLiveOp = ev.target.closest('button[data-action="completar-live-op"][data-operacion]');
    if (btnCompletarLiveOp) {
      ev.preventDefault();
      ev.stopPropagation();
      const operacionId = btnCompletarLiveOp.dataset.operacion;
      completarLiveOperacion(operacionId, btnCompletarLiveOp).catch((err) => {
        console.error(err);
        toast(err.message || 'No se pudo marcar la operacion');
        btnCompletarLiveOp.disabled = false;
        btnCompletarLiveOp.textContent = 'Marcar completada';
      });
      return;
    }

    const head = ev.target.closest('.ac-head[data-sorteo-id]');
    if (!head) return;

    const id = String(head.dataset.sorteoId);
    if (state.open.has(id)) state.open.delete(id);
    else state.open.add(id);

    rerenderAndRefreshEmpty();
  });
}

function setupLiveOperacionModal() {
  if (!liveOpModal || !liveOpForm) return;

  liveOpTipo?.addEventListener('change', () => {
    if (!liveOpDescripcion.value.trim()) {
      liveOpDescripcion.value = getLiveOperationDefaultDescription(liveOpTipo.value);
    }
  });

  liveOpModal.addEventListener('click', (event) => {
    if (event.target.closest('[data-live-op-close]')) {
      closeLiveOperacionModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !liveOpModal.classList.contains('hidden')) {
      closeLiveOperacionModal();
    }
  });

  liveOpForm.addEventListener('submit', submitLiveOperacionForm);
}

async function init() {
  const user = await requireCuentasAccess();
  if (!user) return;

  document.body.classList.remove('auth-pending');
  setupFilters();
  setupAcordeonToggle();
  setupLiveOperacionModal();
  refreshEmptyStateCopy();
  cargarCuentas({ silent: false });
  setInterval(() => cargarCuentas({ silent: true }), REFRESH_MS);
}

document.addEventListener('DOMContentLoaded', init);
