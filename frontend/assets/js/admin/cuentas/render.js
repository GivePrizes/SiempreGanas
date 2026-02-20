// frontend/assets/js/admin/cuentas/render.js

function sanitizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('57')) return digits;
  if (digits.length === 10) return `57${digits}`;
  if (digits.length > 10) return `57${digits.slice(-10)}`;
  return digits;
}

function buildWhatsappLink(phoneDigits, nombre = '') {
  if (!phoneDigits) return '';
  const text = encodeURIComponent(`Hola ${nombre || ''} ðŸ‘‹ Te escribo por tu participaciÃ³n en Mathome.`);
  return `https://wa.me/${phoneDigits}?text=${text}`;
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
  el.textContent = `â€” ${text} â€”`;
  return el;
}

function renderRow(p, s) {
  const estado = (p.entregaEstado || 'pendiente');
  const phoneDigits = sanitizePhone(p.telefono);
  const wa = phoneDigits ? buildWhatsappLink(phoneDigits, p.nombre) : '';
  const numerosTxt = (p.numeros && p.numeros.length) ? p.numeros.join(', ') : 'â€”';

  const row = document.createElement('div');
  row.className = `user-row ${estado === 'entregada' ? 'is-done' : 'is-pending'}`;

  row.innerHTML = `
    <div class="user-left">
      <div class="user-name">${p.nombre || 'Sin nombre'}</div>
      <div class="user-meta">
        <span class="pill ${estado === 'entregada' ? 'pill-success' : 'pill-warning'}">
          ${estado === 'entregada' ? 'ENTREGADA' : 'PENDIENTE'}
        </span>
        <span class="muted">${p.email || 'Sin correo'}</span>
        <span class="muted">${p.telefono || 'Sin telÃ©fono'}</span>
      </div>
      <div class="numbers">NÃºmeros: ${numerosTxt}</div>
      ${p.entregadaAt ? `<div class="muted tiny">Entregada: ${new Date(p.entregadaAt).toLocaleString()}</div>` : ''}
    </div>

    <div class="user-right">
      <a class="btn-mini" ${wa ? `href="${wa}" target="_blank" rel="noopener"` : ''} data-action="wa"
         ${wa ? '' : 'aria-disabled="true"'}>WhatsApp</a>

      <a class="btn-mini" ${
        p.email ? `href="mailto:${p.email}?subject=${encodeURIComponent('Mathome â€” Entrega de cuenta')}"` : ''
      } data-action="mail" ${p.email ? '' : 'aria-disabled="true"'}>Email</a>

      <button class="btn-mini primary"
        data-action="entregar"
        data-sorteo="${s.sorteoId}"
        data-user="${p.usuarioId}"
        ${estado === 'entregada' ? 'disabled' : ''}>
        ${estado === 'entregada' ? 'Entregada âœ…' : 'Marcar entregada'}
      </button>
    </div>
  `;

  // Deshabilitar visual si no hay link
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

// Este render NO hace fetch, NO marca entregada.
// Solo construye UI, acordeÃ³n, badges, y botones con data-attrs.
export function renderAcordeon(sorteos, uiState) {
  const cont = document.getElementById('acordeonSorteos');
  const empty = document.getElementById('emptyState');
  if (!cont) return;

  const state = uiState || { open: new Set(), filter: 'todos', q: '' };

  cont.innerHTML = '';

  if (!Array.isArray(sorteos) || sorteos.length === 0) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  const q = (state.q || '').trim().toLowerCase();
  const filter = state.filter || 'todos';

  const matchesQuery = (s, p) => {
    if (!q) return true;
    const hay = [
      s.descripcion,
      s.premio,
      String(s.sorteoId),
      p.nombre,
      p.email,
      p.telefono,
      ...(p.numeros || []).map(String),
    ].join(' ').toLowerCase();

    return hay.includes(q);
  };

  const matchesFilter = (p) => {
    if (filter === 'todos') return true;
    return (p.entregaEstado || 'pendiente') === filter;
  };

  for (const s of sorteos) {
    const participantes = Array.isArray(s.participantes) ? s.participantes : [];

    const pend = participantes.filter(p => (p.entregaEstado || 'pendiente') === 'pendiente');
    const ent  = participantes.filter(p => (p.entregaEstado || 'pendiente') === 'entregada');

    const pendFil = pend.filter(matchesFilter).filter(p => matchesQuery(s, p));
    const entFil  = ent.filter(matchesFilter).filter(p => matchesQuery(s, p));

    const totalMostrando = pendFil.length + entFil.length;
    if (!totalMostrando) continue;

    const isOpen = state.open.has(String(s.sorteoId));

    const item = document.createElement('div');
    item.className = `ac-item ${isOpen ? 'open' : ''}`;

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'ac-head';
    head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    head.dataset.sorteoId = s.sorteoId;

    head.innerHTML = `
      <div class="ac-title">
        <div class="ac-name">${s.descripcion || `Sorteo #${s.sorteoId}`}</div>
        <div class="ac-sub">
          <span class="muted">#${s.sorteoId}</span>
          ${s.premio ? `<span class="muted">Â· Beneficio: ${s.premio}</span>` : ''}
        </div>
      </div>

      <div class="ac-badges">
        <span class="badge warning">Pendientes: ${s.resumen?.pendientes ?? pend.length}</span>
        <span class="badge success">Entregadas: ${s.resumen?.entregadas ?? ent.length}</span>
        <span class="badge neutral">Mostrando: ${totalMostrando}</span>
      </div>

      <div class="ac-chevron" aria-hidden="true">${isOpen ? 'â–²' : 'â–¼'}</div>
    `;

    const body = document.createElement('div');
    body.className = 'ac-body';

    const list = document.createElement('div');
    list.className = 'users-list';

    // âœ… Pendientes
    list.appendChild(sectionTitle('Pendientes', pendFil.length));
    if (pendFil.length) pendFil.forEach(p => list.appendChild(renderRow(p, s)));
    else list.appendChild(miniEmpty('Sin pendientes en este filtro'));

    // âœ… Entregadas
    list.appendChild(sectionTitle('Entregadas', entFil.length));
    if (entFil.length) entFil.forEach(p => list.appendChild(renderRow(p, s)));
    else list.appendChild(miniEmpty('Sin entregadas en este filtro'));

    body.appendChild(list);

    item.appendChild(head);
    item.appendChild(body);
    cont.appendChild(item);
  }

  if (!cont.children.length) empty?.classList.remove('hidden');
  else empty?.classList.add('hidden');
}



