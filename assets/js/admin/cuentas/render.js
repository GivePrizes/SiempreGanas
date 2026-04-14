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

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '$0';
  return `$${amount.toLocaleString('es-CO')}`;
}

function getLiveOperationTypeData(tipo) {
  if (tipo === 'referido') return { label: 'Referido' };
  if (tipo === 'premio_efectivo') return { label: 'Premio efectivo' };
  if (tipo === 'premio_extra') return { label: 'Premio extra' };
  return { label: 'Ajuste' };
}

function buildWhatsappLink(phoneDigits, nombre = '', context = {}) {
  if (!phoneDigits) return '';
  const texto = buildWhatsappMessage(nombre, context);
  const text = encodeURIComponent(texto);
  return `https://wa.me/${phoneDigits}?text=${text}`;
}

function buildWhatsappMessage(nombre = '', context = {}) {
  const saludo = nombre ? `Hola ${nombre}` : 'Hola';
  const sorteo = context.sorteoDescripcion ? ` del sorteo ${context.sorteoDescripcion}` : '';

  if (context.esBonusGratis) {
    return `${saludo}, te escribo por tu bonus de fidelidad en Mathome. Tienes pendiente tu cuenta gratis y voy a coordinarte la entrega por este medio.`;
  }

  if (context.liveOperationType) {
    const typeLabel = getLiveOperationTypeData(context.liveOperationType).label.toLowerCase();
    const monto = context.monto ? ` por ${formatMoney(context.monto)}` : '';
    const descripcion = context.descripcion ? ` Detalle: ${context.descripcion}` : '';
    return `${saludo}, te escribo por tu ${typeLabel}${monto}${sorteo} en Mathome Live.${descripcion}`;
  }

  if (context.modalidad === 'live') {
    const beneficio = context.beneficioEntrada || 'tu beneficio de entrada';
    return `${saludo}, ya quedaste confirmado${sorteo} en Mathome Live. Te escribo para entregarte ${beneficio} por este medio.`;
  }

  return `${saludo}, te escribo por tu participacion${sorteo} en Mathome.`;
}

function sectionTitle(label, count) {
  const el = document.createElement('div');
  el.className = 'section-title';
  el.innerHTML = `
    <div class="section-left">
      <span class="section-name">${label}</span>
      <span class="section-count">${count}</span>
    </div>
  `;
  return el;
}

function miniEmpty(text) {
  const el = document.createElement('div');
  el.className = 'mini-empty';
  el.textContent = `— ${text} —`;
  return el;
}

function getTipoProductoData(tipoProducto) {
  if (tipoProducto === 'bonus') {
    return { label: 'Bonus', className: 'badge type-bonus' };
  }

  if (tipoProducto === 'live') {
    return { label: 'Live', className: 'badge type-live' };
  }

  if (tipoProducto === 'juegos') {
    return { label: 'Juegos', className: 'badge type-game' };
  }

  return tipoProducto === 'combo'
    ? { label: 'Combo', className: 'badge type-combo' }
    : { label: 'Pantalla', className: 'badge type-screen' };
}

function renderParticipanteRow(p, s) {
  const estado = p.entregaEstado || 'pendiente';
  const phoneDigits = sanitizePhone(p.telefono);
  const esLive = s.modalidad === 'live';
  const beneficioLive = s.liveBeneficioEntradaNombre || 'el beneficio de entrada';
  const wa = phoneDigits
    ? buildWhatsappLink(phoneDigits, p.nombre, {
        modalidad: s.modalidad,
        sorteoDescripcion: s.descripcion,
        esBonusGratis: Boolean(p.esBonusGratis),
        beneficioEntrada: beneficioLive,
      })
    : '';
  const numerosTxt = (p.numeros && p.numeros.length) ? p.numeros.join(', ') : '—';
  const detallePrincipal = p.esBonusGratis
    ? 'Beneficio: Cuenta gratis por fidelidad'
    : esLive
      ? `Entrega Live: ${beneficioLive}`
      : `Numeros: ${numerosTxt}`;
  const detalleSecundario = p.esBonusGratis
    ? '<div class="muted tiny">No depende de un sorteo puntual.</div>'
    : esLive
      ? `
        <div class="muted tiny">Numeros aprobados: ${escapeHtml(numerosTxt)}</div>
        ${
          s.liveBeneficioEntradaDescripcion
            ? `<div class="muted tiny">${escapeHtml(s.liveBeneficioEntradaDescripcion)}</div>`
            : '<div class="muted tiny">Entrega manual por WhatsApp para participantes confirmados del Live.</div>'
        }
      `
      : '';

  const row = document.createElement('div');
  row.className = `user-row ${estado === 'entregada' ? 'is-done' : 'is-pending'}`;

  row.innerHTML = `
    <div class="user-left">
      <div class="user-name">${escapeHtml(p.nombre || 'Sin nombre')}</div>
      <div class="user-meta">
        <span class="pill ${estado === 'entregada' ? 'pill-success' : 'pill-warning'}">
          ${estado === 'entregada' ? 'ENTREGADA' : 'PENDIENTE'}
        </span>
        <span class="muted">${escapeHtml(p.email || 'Sin correo')}</span>
        <span class="muted">${escapeHtml(p.telefono || 'Sin telefono')}</span>
      </div>
      <div class="numbers">${detallePrincipal}</div>
      ${detalleSecundario}
      ${p.entregadaAt ? `<div class="muted tiny">Entregada: ${new Date(p.entregadaAt).toLocaleString()}</div>` : ''}
    </div>

    <div class="user-right">
      <a class="btn-mini" ${wa ? `href="${wa}" target="_blank" rel="noopener"` : ''} data-action="wa"
         ${wa ? '' : 'aria-disabled="true"'}>WhatsApp</a>

      <a class="btn-mini" ${
        p.email ? `href="mailto:${escapeHtml(p.email)}?subject=${encodeURIComponent('Mathome — Entrega de cuenta')}"` : ''
      } data-action="mail" ${p.email ? '' : 'aria-disabled="true"'}>Email</a>

      ${
        esLive && !p.esBonusGratis
          ? `
            <button
              class="btn-mini secondary"
              type="button"
              data-action="crear-live-op"
              data-sorteo="${s.sorteoId}"
              data-usuario="${p.usuarioId}"
              data-nombre="${escapeHtml(p.nombre || '')}"
              data-email="${escapeHtml(p.email || '')}"
              data-telefono="${escapeHtml(p.telefono || '')}"
              data-sorteo-desc="${escapeHtml(s.descripcion || '')}"
            >
              Pago Live
            </button>
          `
          : ''
      }

      <button class="btn-mini primary"
        data-action="entregar"
        data-entrega="${p.entregaId}"
        data-user="${p.usuarioId}"
        ${estado === 'entregada' ? 'disabled' : ''}>
        ${estado === 'entregada' ? 'Entregada ✅' : 'Marcar entregada'}
      </button>
    </div>
  `;

  const waEl = row.querySelector('[data-action="wa"]');
  if (waEl && !wa) {
    waEl.classList.add('disabled');
    waEl.removeAttribute('href');
  }

  const mailEl = row.querySelector('[data-action="mail"]');
  if (mailEl && !p.email) {
    mailEl.classList.add('disabled');
    mailEl.removeAttribute('href');
  }

  return row;
}

function renderLiveOperationRow(op, s) {
  const estado = op.estado || 'pendiente';
  const tipoMeta = getLiveOperationTypeData(op.tipo);
  const phoneDigits = sanitizePhone(op.telefono);
  const wa = phoneDigits
    ? buildWhatsappLink(phoneDigits, op.nombre, {
        liveOperationType: op.tipo,
        monto: op.monto,
        descripcion: op.descripcion,
        sorteoDescripcion: s.descripcion,
      })
    : '';

  const row = document.createElement('div');
  row.className = `live-op-row ${estado === 'completada' ? 'is-done' : 'is-pending'}`;

  row.innerHTML = `
    <div class="live-op-left">
      <div class="live-op-title">
        <span>${escapeHtml(op.nombre || 'Sin nombre')}</span>
        <span class="badge type-live">${escapeHtml(tipoMeta.label)}</span>
        <span class="pill ${estado === 'completada' ? 'pill-success' : 'pill-warning'}">
          ${estado === 'completada' ? 'COMPLETADA' : 'PENDIENTE'}
        </span>
      </div>
      <div class="live-op-meta">
        <span>${escapeHtml(op.email || 'Sin correo')}</span>
        <span>${escapeHtml(op.telefono || 'Sin telefono')}</span>
        ${op.monto != null ? `<span>${formatMoney(op.monto)}</span>` : ''}
      </div>
      <div class="live-op-description">${escapeHtml(op.descripcion || 'Sin descripcion')}</div>
      ${op.completadaAt ? `<div class="muted tiny">Completada: ${new Date(op.completadaAt).toLocaleString()}</div>` : ''}
    </div>

    <div class="live-op-actions">
      <a class="btn-mini" ${wa ? `href="${wa}" target="_blank" rel="noopener"` : ''} data-action="wa"
         ${wa ? '' : 'aria-disabled="true"'}>WhatsApp</a>
      <a class="btn-mini" ${
        op.email ? `href="mailto:${escapeHtml(op.email)}?subject=${encodeURIComponent('Mathome — Pago Live')}"` : ''
      } data-action="mail" ${op.email ? '' : 'aria-disabled="true"'}>Email</a>
      <button
        type="button"
        class="btn-mini primary"
        data-action="completar-live-op"
        data-operacion="${op.operacionId}"
        ${estado === 'completada' ? 'disabled' : ''}
      >
        ${estado === 'completada' ? 'Completada ✅' : 'Marcar completada'}
      </button>
    </div>
  `;

  const waEl = row.querySelector('[data-action="wa"]');
  if (waEl && !wa) {
    waEl.classList.add('disabled');
    waEl.removeAttribute('href');
  }

  const mailEl = row.querySelector('[data-action="mail"]');
  if (mailEl && !op.email) {
    mailEl.classList.add('disabled');
    mailEl.removeAttribute('href');
  }

  return row;
}

export function renderAcordeon(sorteos, uiState) {
  const cont = document.getElementById('acordeonSorteos');
  const empty = document.getElementById('emptyState');
  if (!cont) return;

  const state = uiState || { open: new Set(), filter: 'todos', q: '', tipoProducto: 'todos' };

  cont.innerHTML = '';

  if (!Array.isArray(sorteos) || sorteos.length === 0) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  const q = (state.q || '').trim().toLowerCase();
  const filter = state.filter || 'todos';
  const tipoProductoFilter = state.tipoProducto || 'todos';

  const matchesParticipantQuery = (s, p) => {
    if (!q) return true;
    const hay = [
      s.descripcion,
      s.premio,
      s.tipoProducto,
      String(s.sorteoId),
      p.nombre,
      p.email,
      p.telefono,
      ...(p.numeros || []).map(String),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  };

  const matchesOperationQuery = (s, op) => {
    if (!q) return true;
    const hay = [
      s.descripcion,
      s.premio,
      s.tipoProducto,
      String(s.sorteoId),
      op.nombre,
      op.email,
      op.telefono,
      op.tipo,
      op.descripcion,
      op.monto ?? '',
    ].join(' ').toLowerCase();
    return hay.includes(q);
  };

  const matchesSorteoQueryOnly = (s) => {
    if (!q) return true;
    const hay = [
      s.descripcion,
      s.premio,
      s.tipoProducto,
      String(s.sorteoId),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  };

  const matchesParticipantFilter = (p) => {
    if (filter === 'todos') return true;
    return (p.entregaEstado || 'pendiente') === filter;
  };

  const matchesOperationFilter = (op) => {
    if (filter === 'todos') return true;
    if (filter === 'pendiente') return (op.estado || 'pendiente') === 'pendiente';
    if (filter === 'entregada') return (op.estado || '') === 'completada';
    return true;
  };

  for (const s of sorteos) {
    const tipoProducto = s.tipoProducto === 'bonus'
      ? 'bonus'
      : s.tipoProducto === 'juegos'
        ? 'juegos'
        : s.tipoProducto === 'combo'
          ? 'combo'
          : 'pantalla';
    const isLive = s.modalidad === 'live';
    const tipoMeta = getTipoProductoData(tipoProducto);
    const liveMeta = isLive ? getTipoProductoData('live') : null;

    const matchesTipoProducto =
      tipoProductoFilter === 'todos'
      || (tipoProductoFilter === 'live' && isLive)
      || tipoProducto === tipoProductoFilter;

    if (!matchesTipoProducto) continue;

    const participantes = Array.isArray(s.participantes) ? s.participantes : [];
    const liveOperaciones = Array.isArray(s.liveOperaciones) ? s.liveOperaciones : [];

    const pendientes = participantes.filter((p) => (p.entregaEstado || 'pendiente') === 'pendiente');
    const entregadas = participantes.filter((p) => (p.entregaEstado || 'pendiente') === 'entregada');

    const pendFil = pendientes.filter(matchesParticipantFilter).filter((p) => matchesParticipantQuery(s, p));
    const entFil = entregadas.filter(matchesParticipantFilter).filter((p) => matchesParticipantQuery(s, p));

    const livePend = liveOperaciones
      .filter((op) => (op.estado || 'pendiente') === 'pendiente')
      .filter(matchesOperationFilter)
      .filter((op) => matchesOperationQuery(s, op));

    const liveDone = liveOperaciones
      .filter((op) => (op.estado || '') === 'completada')
      .filter(matchesOperationFilter)
      .filter((op) => matchesOperationQuery(s, op));

    const totalMostrando = pendFil.length + entFil.length + livePend.length + liveDone.length;
    const sorteoSinContenido = participantes.length === 0 && liveOperaciones.length === 0;
    const mostrarSorteoVacio =
      sorteoSinContenido &&
      filter === 'todos' &&
      matchesSorteoQueryOnly(s);

    if (!totalMostrando && !mostrarSorteoVacio) continue;

    const isOpen = state.open.has(String(s.sorteoId));
    const referenciaLabel = s.tipoProducto === 'bonus' ? 'BONUS' : `#${s.sorteoId}`;
    const contextoSecundario = s.tipoProducto === 'bonus'
      ? '<span class="muted">· Beneficio: Cuenta gratis por fidelidad</span>'
      : isLive
        ? `
          <span class="muted">· Modalidad: Live</span>
          ${s.liveBeneficioEntradaNombre ? `<span class="muted">· Entrega: ${escapeHtml(s.liveBeneficioEntradaNombre)}</span>` : ''}
        `
        : (s.premio ? `<span class="muted">· Ganador: ${escapeHtml(s.premio)}</span>` : '');

    const item = document.createElement('div');
    item.className = `ac-item ${isOpen ? 'open' : ''}`;

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'ac-head';
    head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    head.dataset.sorteoId = s.sorteoId;

    head.innerHTML = `
      <div class="ac-title">
        <div class="ac-name">${escapeHtml(s.descripcion || `Sorteo #${s.sorteoId}`)}</div>
        <div class="ac-sub">
          <span class="muted">${referenciaLabel}</span>
          <span class="${tipoMeta.className}">${tipoMeta.label}</span>
          ${liveMeta ? `<span class="${liveMeta.className}">${liveMeta.label}</span>` : ''}
          ${contextoSecundario}
        </div>
      </div>

      <div class="ac-badges">
        <span class="badge warning">Pendientes: ${s.resumen?.pendientes ?? pendientes.length}</span>
        <span class="badge success">Entregadas: ${s.resumen?.entregadas ?? entregadas.length}</span>
        ${isLive ? `<span class="badge neutral">Pagos Live: ${livePend.length + liveDone.length}</span>` : ''}
        <span class="badge neutral">Mostrando: ${totalMostrando}</span>
      </div>

      <div class="ac-chevron" aria-hidden="true">${isOpen ? '▲' : '▼'}</div>
    `;

    const body = document.createElement('div');
    body.className = 'ac-body';

    const list = document.createElement('div');
    list.className = 'users-list';

    list.appendChild(sectionTitle('Pendientes', pendFil.length));
    if (pendFil.length) pendFil.forEach((p) => list.appendChild(renderParticipanteRow(p, s)));
    else list.appendChild(miniEmpty('Sin pendientes en este filtro'));

    list.appendChild(sectionTitle('Entregadas', entFil.length));
    if (entFil.length) entFil.forEach((p) => list.appendChild(renderParticipanteRow(p, s)));
    else list.appendChild(miniEmpty('Sin entregadas en este filtro'));

    if (isLive) {
      const opsWrap = document.createElement('div');
      opsWrap.className = 'live-ops-list';

      opsWrap.appendChild(sectionTitle('Pagos Live pendientes', livePend.length));
      if (livePend.length) {
        livePend.forEach((op) => opsWrap.appendChild(renderLiveOperationRow(op, s)));
      } else {
        opsWrap.appendChild(miniEmpty('Sin pagos Live pendientes en este filtro'));
      }

      opsWrap.appendChild(sectionTitle('Pagos Live completados', liveDone.length));
      if (liveDone.length) {
        liveDone.forEach((op) => opsWrap.appendChild(renderLiveOperationRow(op, s)));
      } else {
        opsWrap.appendChild(miniEmpty('Sin pagos Live completados en este filtro'));
      }

      list.appendChild(opsWrap);
    }

    body.appendChild(list);
    item.appendChild(head);
    item.appendChild(body);
    cont.appendChild(item);
  }

  if (!cont.children.length) empty?.classList.remove('hidden');
  else empty?.classList.add('hidden');
}
