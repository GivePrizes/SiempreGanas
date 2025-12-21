// frontend/assets/js/admin/cuentas-sorteo.js
import { hasPerm } from './permisos.js';
import { fetchCuentasPorSorteos, patchMarcarEntregada } from './cuentas/api.js';
import { normalizeCuentasApi } from './cuentas/adapter.js';

const REFRESH_MS = 15000;

const elAcordeon = document.getElementById('acordeonSorteos');
const elEmpty = document.getElementById('emptyState');
const elQ = document.getElementById('q');
const btnRefrescar = document.getElementById('btnRefrescar');

let state = {
  filter: 'todos',     // todos | pendiente | entregada
  q: '',
  open: new Set(),     // ids abiertos
  cache: [],           // data normalizada
};

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2000);
}

function guardAdmin() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') {
    alert('No tienes acceso.');
    location.href = '../index.html';
    return false;
  }

  // Solo cuentas (si estás usando permisos)
  if (typeof hasPerm === 'function' && !hasPerm('cuentas:gestionar')) {
    alert('No tienes permiso para entregar cuentas.');
    location.href = 'panel.html';
    return false;
  }

  return true;
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

function buildWhatsappLink(phoneDigits, nombre = '') {
  if (!phoneDigits) return '';
  const text = encodeURIComponent(`Hola ${nombre || ''} 👋 Te escribo por tu participación en Siempre Gana.`);
  return `https://wa.me/${phoneDigits}?text=${text}`;
}

function matchesFilterUser(u) {
  if (state.filter === 'todos') return true;
  return u.estado === state.filter;
}

function matchesQuery(sorteo, u) {
  const q = state.q.trim().toLowerCase();
  if (!q) return true;

  const hay = [
    sorteo.sorteo_titulo,
    sorteo.sorteo_premio,
    String(sorteo.sorteo_id),
    u.nombre,
    u.email,
    u.telefono,
    ...(u.numeros || []).map(String),
  ].join(' ').toLowerCase();

  return hay.includes(q);
}

function render() {
  const data = state.cache || [];
  elAcordeon.innerHTML = '';

  if (!data.length) {
    elEmpty.classList.remove('hidden');
    return;
  }
  elEmpty.classList.add('hidden');

  for (const sorteo of data) {
    const usersFiltered = (sorteo.usuarios || [])
      .filter(matchesFilterUser)
      .filter(u => matchesQuery(sorteo, u));

    if (!usersFiltered.length) continue;

    const isOpen = state.open.has(String(sorteo.sorteo_id));

    const item = document.createElement('div');
    item.className = `ac-item ${isOpen ? 'open' : ''}`;

    const head = document.createElement('div');
    head.className = 'ac-head';
    head.addEventListener('click', () => {
      const k = String(sorteo.sorteo_id);
      if (state.open.has(k)) state.open.delete(k);
      else state.open.add(k);
      render();
    });

    const title = document.createElement('div');
    title.className = 'ac-title';
    title.innerHTML = `
      <strong>${sorteo.sorteo_titulo}</strong>
      <span>#${sorteo.sorteo_id}${sorteo.sorteo_premio ? ` · Premio: ${sorteo.sorteo_premio}` : ''}</span>
    `;

    const badges = document.createElement('div');
    badges.className = 'ac-badges';
    badges.innerHTML = `
      <span class="badge pendiente">Pendientes: ${sorteo.pendientes}</span>
      <span class="badge entregada">Entregadas: ${sorteo.entregadas}</span>
      <span class="badge">Mostrando: ${usersFiltered.length}</span>
    `;

    head.appendChild(title);
    head.appendChild(badges);

    const body = document.createElement('div');
    body.className = 'ac-body';

    const list = document.createElement('div');
    list.className = 'users-list';

    for (const u of usersFiltered) {
      const row = document.createElement('div');
      row.className = 'user-row';

      const phoneDigits = sanitizePhone(u.telefono);
      const wa = phoneDigits ? buildWhatsappLink(phoneDigits, u.nombre) : '';

      const numerosTxt = (u.numeros && u.numeros.length) ? u.numeros.join(', ') : '—';

      const left = document.createElement('div');
      left.className = 'user-left';
      left.innerHTML = `
        <div class="user-name">${u.nombre}</div>
        <div class="user-meta">
          <span class="badge ${u.estado === 'entregada' ? 'entregada' : 'pendiente'}">${u.estado}</span>
          ${u.email ? `<span>${u.email}</span>` : `<span class="text-muted">Sin correo</span>`}
          ${u.telefono ? `<span>${u.telefono}</span>` : `<span class="text-muted">Sin teléfono</span>`}
        </div>
        <div class="numbers">Números: ${numerosTxt}</div>
      `;

      const right = document.createElement('div');
      right.className = 'user-right';

      const btnWA = document.createElement('a');
      btnWA.className = 'btn-mini';
      btnWA.textContent = 'WhatsApp';
      btnWA.href = wa || '#';
      btnWA.target = '_blank';
      btnWA.rel = 'noopener';
      if (!wa) {
        btnWA.style.opacity = '.5';
        btnWA.style.pointerEvents = 'none';
      }

      const btnMail = document.createElement('a');
      btnMail.className = 'btn-mini';
      btnMail.textContent = 'Email';
      btnMail.href = u.email ? `mailto:${u.email}?subject=${encodeURIComponent('Siempre Gana — Entrega de cuenta')}` : '#';
      if (!u.email) {
        btnMail.style.opacity = '.5';
        btnMail.style.pointerEvents = 'none';
      }

      const btnEntregar = document.createElement('button');
      btnEntregar.className = 'btn-mini primary';
      btnEntregar.textContent = (u.estado === 'entregada') ? 'Entregada ✅' : 'Marcar entregada';
      btnEntregar.disabled = (u.estado === 'entregada');

      btnEntregar.addEventListener('click', async (e) => {
        e.stopPropagation();
        btnEntregar.disabled = true;
        btnEntregar.textContent = 'Guardando...';

        try {
          await patchMarcarEntregada(sorteo.sorteo_id, u.usuario_id);
          toast('Marcado como entregada ✅');
          await refresh(true);
        } catch (err) {
          console.error(err);
          toast('No se pudo marcar. Revisa el endpoint/permisos.');
          btnEntregar.disabled = false;
          btnEntregar.textContent = 'Marcar entregada';
        }
      });

      right.appendChild(btnWA);
      right.appendChild(btnMail);
      right.appendChild(btnEntregar);

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }

    body.appendChild(list);
    item.appendChild(head);
    item.appendChild(body);
    elAcordeon.appendChild(item);
  }

  if (!elAcordeon.children.length) elEmpty.classList.remove('hidden');
  else elEmpty.classList.add('hidden');
}

async function refresh(silent = false) {
  const prevScroll = window.scrollY;

  if (!silent && btnRefrescar) {
    btnRefrescar.disabled = true;
    btnRefrescar.textContent = 'Actualizando...';
  }

  try {
    const raw = await fetchCuentasPorSorteos();
    const data = normalizeCuentasApi(raw);

    // 🔎 logs útiles (te dirán EXACTO si llega vacío o si el shape no coincide)
    console.log('[CUENTAS] RAW:', raw);
    console.log('[CUENTAS] NORMALIZED:', data);

    state.cache = data;
    render();
    window.scrollTo({ top: prevScroll });
  } finally {
    if (!silent && btnRefrescar) {
      btnRefrescar.disabled = false;
      btnRefrescar.textContent = '🔄 Refrescar';
    }
  }
}

function setupFilters() {
  elQ?.addEventListener('input', () => {
    state.q = elQ.value || '';
    render();
  });

  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.dataset.filter || 'todos';
      render();
    });
  });

  btnRefrescar?.addEventListener('click', () => refresh(false));
}

async function init() {
  if (!guardAdmin()) return;
  setupFilters();
  await refresh(false);
  setInterval(() => refresh(true), REFRESH_MS);
}

init().catch(err => {
  console.error(err);
  toast('Error cargando cuentas. Revisa el servicio.');
});
