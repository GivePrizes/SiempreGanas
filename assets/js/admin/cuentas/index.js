import { renderAcordeon } from './render.js?v=20260422c';

const API_URL = window.API_URL || '';
const REFRESH_MS = 15000;
const AUTO_REFRESH_GRACE_MS = 8000;

const elAcordeon = document.getElementById('acordeonSorteos');
const elEmpty = document.getElementById('emptyState');
const elEmptyTitle = document.getElementById('emptyTitle');
const elEmptySub = document.getElementById('emptySub');
const elQ = document.getElementById('q');
const elTipoProductoFiltro = document.getElementById('tipoProductoFiltro');
const btnRefrescar = document.getElementById('btnRefrescar');
const referralProgramSection = document.getElementById('referralProgramSection');
const referralSummaryCards = document.getElementById('referralSummaryCards');
const referralPendingCount = document.getElementById('referralPendingCount');
const referralPendingList = document.getElementById('referralPendingList');
const referralLeaderboard = document.getElementById('referralLeaderboard');

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
  suspendAutoRefreshUntil: 0,
  lastViewportAnchor: null,
};

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '$0';
  return `$${amount.toLocaleString('es-CO')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('57')) return digits;
  if (digits.length === 10) return `57${digits}`;
  if (digits.length > 10) return `57${digits.slice(-10)}`;
  return digits;
}

function buildReferralWhatsappLink(item) {
  const phone = sanitizePhone(item?.telefono);
  if (!phone) return '';

  const tier = item?.tier_nombre ? ` por ${item.tier_nombre}` : '';
  const amount = item?.monto ? ` de ${formatMoney(item.monto)}` : '';
  const text = encodeURIComponent(
    `Hola ${item?.nombre || ''}, te escribo de Mathome por tu pago pendiente${amount}${tier} del programa de socios. Voy a coordinar contigo la entrega por este medio.`
  );

  return `https://wa.me/${phone}?text=${text}`;
}

function cssEscape(value) {
  const raw = String(value ?? '');
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(raw);
  }
  return raw.replace(/"/g, '\\"');
}

function captureViewportAnchorFromElement(element) {
  const item = element?.closest?.('.ac-item');
  const head = item?.querySelector?.('.ac-head[data-sorteo-id]');
  if (!item || !head?.dataset?.sorteoId) return null;

  return {
    sorteoId: String(head.dataset.sorteoId),
    viewportTop: item.getBoundingClientRect().top,
  };
}

function captureViewportAnchorBySorteoId(sorteoId) {
  if (!elAcordeon || !sorteoId) return null;
  const head = elAcordeon.querySelector(`.ac-head[data-sorteo-id="${cssEscape(sorteoId)}"]`);
  return head ? captureViewportAnchorFromElement(head) : null;
}

function captureBestViewportAnchor() {
  if (!elAcordeon) return null;

  const openItems = Array.from(elAcordeon.querySelectorAll('.ac-item.open .ac-head[data-sorteo-id]'));
  if (openItems.length) {
    const preferred = openItems.find((head) => head.getBoundingClientRect().bottom > 120) || openItems[0];
    return captureViewportAnchorFromElement(preferred);
  }

  const firstHead = elAcordeon.querySelector('.ac-head[data-sorteo-id]');
  return firstHead ? captureViewportAnchorFromElement(firstHead) : null;
}

function rememberViewportContext(element = null, sorteoId = '') {
  state.lastViewportAnchor =
    captureViewportAnchorFromElement(element)
    || captureViewportAnchorBySorteoId(sorteoId)
    || captureBestViewportAnchor();

  state.suspendAutoRefreshUntil = Date.now() + AUTO_REFRESH_GRACE_MS;
}

function restoreViewportContext(anchor, fallbackScroll) {
  if (!elAcordeon) {
    window.scrollTo({ top: fallbackScroll });
    return;
  }

  const sorteoId = anchor?.sorteoId;
  if (!sorteoId) {
    window.scrollTo({ top: fallbackScroll });
    return;
  }

  const head = elAcordeon.querySelector(`.ac-head[data-sorteo-id="${cssEscape(sorteoId)}"]`);
  const item = head?.closest?.('.ac-item');
  if (!item) {
    window.scrollTo({ top: fallbackScroll });
    return;
  }

  const targetTop = Math.max(
    0,
    window.scrollY + item.getBoundingClientRect().top - Number(anchor?.viewportTop || 0)
  );

  window.scrollTo({ top: targetTop });
}

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

function renderReferralProgram(data) {
  if (!referralProgramSection || !referralSummaryCards || !referralPendingList || !referralLeaderboard) {
    return;
  }

  if (data?.enabled === false) {
    referralProgramSection.hidden = true;
    return;
  }

  referralProgramSection.hidden = false;

  const resumen = data?.resumen || {};
  const pagosPendientes = Array.isArray(data?.pagos_pendientes) ? data.pagos_pendientes : [];
  const ranking = Array.isArray(data?.ranking) ? data.ranking : [];
  const sociosActivos = ranking.length;
  const sociosConNivel = ranking.filter((item) => String(item?.current_tier_nombre || '').trim()).length;
  const sociosConPagosPendientes = ranking.filter((item) => Number(item?.pagos_pendientes || 0) > 0).length;

  referralSummaryCards.innerHTML = [
    {
      label: 'Pendientes Live',
      value: String(Number(resumen.pagos_pendientes || 0)),
      meta: `Por pagar: ${formatMoney(resumen.monto_pendiente || 0)}`,
    },
    {
      label: 'Socios activos',
      value: String(sociosActivos),
      meta: `${sociosConNivel} con nivel · ${sociosConPagosPendientes} con pago pendiente`,
    },
    {
      label: 'Pagado',
      value: String(Number(resumen.pagos_pagados || 0)),
      meta: `Liquidado: ${formatMoney(resumen.monto_pagado || 0)}`,
    },
    {
      label: 'Movimientos',
      value: String(Number(resumen.total_pagos || 0)),
      meta: 'Historial auditado del programa Live',
    },
  ].map((card) => `
    <article class="referral-summary-card">
      <span class="referral-summary-card__label">${card.label}</span>
      <strong class="referral-summary-card__value">${card.value}</strong>
      <span class="referral-summary-card__meta">${card.meta}</span>
    </article>
  `).join('');

  if (referralPendingCount) {
    referralPendingCount.textContent = String(pagosPendientes.length);
  }

  if (!pagosPendientes.length) {
    referralPendingList.innerHTML = '<div class="referral-empty">No hay pagos pendientes del programa de socios Live.</div>';
  } else {
    referralPendingList.innerHTML = pagosPendientes.map((item) => {
      const waLink = buildReferralWhatsappLink(item);
      const alias = item.alias ? `@${item.alias}` : '';
      const code = item.referral_code || '';
      const beneficio = item.beneficio_extra
        ? `<div class="muted tiny">Beneficio extra: ${escapeHtml(item.beneficio_extra)}</div>`
        : '';
      const createdAt = item.created_at
        ? new Date(item.created_at).toLocaleString()
        : '';

      return `
        <article class="referral-payout-item">
          <div class="referral-payout-item__top">
            <div>
              <div class="referral-payout-item__name">${escapeHtml(item.nombre || 'Sin nombre')}</div>
              <div class="referral-payout-item__meta">
                <span class="badge type-live">Live</span>
                ${alias ? `<span>${escapeHtml(alias)}</span>` : ''}
                ${code ? `<span>${escapeHtml(code)}</span>` : ''}
                <span>${escapeHtml(item.total_validados || 0)} validados</span>
                <span>${escapeHtml(item.tier_nombre || 'Sin nivel')}</span>
              </div>
            </div>
            <div class="referral-payout-item__amount">${formatMoney(item.monto || 0)}</div>
          </div>
          <div class="referral-payout-item__tier">
            <strong>Nivel desbloqueado:</strong> ${escapeHtml(item.tier_nombre || 'Sin nivel')}
            · <strong>Meta:</strong> ${escapeHtml(item.minimo_validados || 0)} validados
          </div>
          ${beneficio}
          ${createdAt ? `<div class="muted tiny">Pendiente desde: ${escapeHtml(createdAt)}</div>` : ''}
          <div class="muted tiny">${escapeHtml(item.email || 'Sin correo')} · ${escapeHtml(item.telefono || 'Sin telefono')}</div>
          <div class="referral-payout-item__actions">
            <a class="btn-mini ${waLink ? '' : 'disabled'}" ${waLink ? `href="${waLink}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>WhatsApp</a>
            <button type="button" class="btn-mini primary" data-action="pagar-referral-reward" data-reward="${item.id}">
              Marcar pagado
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  if (!ranking.length) {
    referralLeaderboard.innerHTML = '<div class="referral-empty">Todavia no hay socios Live con avance para mostrar.</div>';
    return;
  }

  referralLeaderboard.innerHTML = ranking.map((item, index) => `
    <article class="referral-rank-item">
      <div class="referral-rank-item__top">
        <div>
          <div class="referral-rank-item__name">#${index + 1} · ${escapeHtml(item.nombre || 'Sin nombre')}</div>
          <div class="referral-rank-item__meta">
            ${item.alias ? `<span>${escapeHtml(`@${item.alias}`)}</span>` : ''}
            ${item.referral_code ? `<span>${escapeHtml(item.referral_code)}</span>` : ''}
            <span class="badge type-live">Live</span>
          </div>
        </div>
        <span class="badge warning">${item.total_validados || 0} validados</span>
      </div>
      <div class="referral-rank-item__stats">
        <span><strong>Nivel actual:</strong> ${escapeHtml(item.current_tier_nombre || 'Sin nivel')}</span>
        <span><strong>Pagos pendientes:</strong> ${escapeHtml(item.pagos_pendientes || 0)}</span>
        <span><strong>Pagos hechos:</strong> ${escapeHtml(item.pagos_pagados || 0)}</span>
      </div>
      <div class="muted tiny">
        Pendiente: ${formatMoney(item.monto_pendiente || 0)} · Pagado: ${formatMoney(item.monto_pagado || 0)}
      </div>
    </article>
  `).join('');
}

async function cargarProgramaReferidos({ silent = false } = {}) {
  const token = getToken();
  if (!token || !referralProgramSection) return;

  try {
    const data = await fetchJSON(`${API_URL}/api/admin/referidos/resumen`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    renderReferralProgram(data);
  } catch (err) {
    console.error('[REFERIDOS] Error:', err);
    if (!silent) {
      toast(err.message || 'No se pudo cargar el programa de socios');
    }
    if (referralProgramSection) {
      referralProgramSection.hidden = true;
    }
  }
}

async function cargarCuentas({ silent = false, force = false } = {}) {
  const token = getToken();
  if (!token) {
    toast('Sesion expirada. Inicia sesion.');
    return;
  }

  const prevScroll = window.scrollY;
  const viewportAnchor = state.lastViewportAnchor || captureBestViewportAnchor();
  if (!force && Date.now() < state.suspendAutoRefreshUntil) {
    return;
  }

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

    restoreViewportContext(viewportAnchor, prevScroll);
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
    state.lastViewportAnchor = null;
    if (!silent && btnRefrescar) {
      btnRefrescar.disabled = false;
      btnRefrescar.textContent = 'Refrescar';
    }
  }
}

async function marcarEntregada(entregaId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesion expirada');

  rememberViewportContext(btn);
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
    await cargarCuentas({ silent: true, force: true });
  } finally {
    if (btn) {
      btn.textContent = oldText || 'Marcar entregada';
    }
  }
}

async function completarLiveOperacion(operacionId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesion expirada');

  rememberViewportContext(btn);
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
    await cargarCuentas({ silent: true, force: true });
  } finally {
    if (btn) {
      btn.textContent = oldText || 'Marcar completada';
    }
  }
}

async function marcarPagoReferido(rewardId, btn) {
  const token = getToken();
  if (!token) throw new Error('Sesion expirada');

  rememberViewportContext(btn);
  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {
    await fetchJSON(
      `${API_URL}/api/admin/referidos/recompensas/${rewardId}/pagar`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
    );

    toast('Pago de referido marcado como realizado');
    await cargarProgramaReferidos({ silent: true });
  } finally {
    if (btn) {
      btn.textContent = oldText || 'Marcar pagado';
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
    rememberViewportContext(null, liveOpSorteoId.value);
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
    await cargarCuentas({ silent: true, force: true });
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

  btnRefrescar?.addEventListener('click', () => cargarCuentas({ silent: false, force: true }));
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

function setupReferralActions() {
  referralProgramSection?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action="pagar-referral-reward"][data-reward]');
    if (!btn) return;

    event.preventDefault();
    const rewardId = btn.dataset.reward;
    marcarPagoReferido(rewardId, btn).catch((err) => {
      console.error(err);
      toast(err.message || 'No se pudo marcar el pago');
      btn.disabled = false;
      btn.textContent = 'Marcar pagado';
    });
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
  setupReferralActions();
  setupLiveOperacionModal();
  refreshEmptyStateCopy();
  cargarProgramaReferidos({ silent: false });
  cargarCuentas({ silent: false, force: true });
  setInterval(() => {
    if (!liveOpModal?.classList.contains('hidden')) return;
    cargarProgramaReferidos({ silent: true });
    cargarCuentas({ silent: true });
  }, REFRESH_MS);
}

document.addEventListener('DOMContentLoaded', init);
