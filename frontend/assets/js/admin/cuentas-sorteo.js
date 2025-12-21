// assets/js/admin/cuentas-sorteo.js
import { hasPerm } from './permisos.js';

const API_URL = window.API_URL || ''; // viene de config.js
const REFRESH_MS = 15000;

const elAcordeon = document.getElementById('acordeonSorteos');
const elEmpty = document.getElementById('emptyState');
const elQ = document.getElementById('q');
const btnRefrescar = document.getElementById('btnRefrescar');

let state = {
  filter: 'todos',   // todos | pendiente | entregada
  q: '',
  open: new Set(),   // sorteos abiertos (por id)
  cache: [],         // data normalizada
};

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 1800);
}

function getToken() {
  return localStorage.getItem('token');
}

function guardAdmin() {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') {
    alert('No tienes acceso.');
    location.href = '../index.html';
    return false;
  }

  // Solo cuentas
  if (!hasPerm('cuentas:gestionar')) {
    alert('No tienes permiso para entregar cuentas.');
    location.href = 'panel.html';
    return false;
  }

  return true;
}

/**
 * ✅ Normaliza respuesta del backend a un formato estable:
 * [
 *  {
 *    sorteo_id,
 *    sorteo_titulo,
 *    sorteo_premio,
 *    pendientes,
 *    entregadas,
 *    usuarios: [
 *      { usuario_id, nombre, email, telefono, numeros: [..], estado }
 *    ]
 *  }
 * ]
 *
 * SOPORTA:
 * - Forma del backend actual: { sorteoId, descripcion, resumen, participantes[] }
 * - Forma agrupada vieja: { usuarios/users[] }
 * - Forma plana: filas
 */
function normalize(data) {
  if (!Array.isArray(data)) return [];

  // ✅ CASO 1 (TU BACKEND REAL): viene por sorteos con participantes
  const looksBackendNew =
    data.length > 0 &&
    (data[0].participantes || data[0].resumen || data[0].sorteoId);

  if (looksBackendNew) {
    return data.map(s => {
      const participantesRaw = s.participantes || [];
      const usuarios = participantesRaw.map(p => ({
        usuario_id: p.usuarioId ?? p.usuario_id ?? p.id ?? p.user_id,
        nombre: p.nombre ?? p.usuario_nombre ?? p.name ?? 'Sin nombre',
        email: p.email ?? p.usuario_email ?? '',
        telefono: p.telefono ?? p.usuario_telefono ?? '',
        numeros: Array.isArray(p.numeros)
          ? p.numeros
          : (typeof p.numeros === 'string'
              ? p.numeros.split(',').map(x => x.trim()).filter(Boolean)
              : []),
        // 👇 IMPORTANTE: backend usa entregaEstado
        estado: p.entregaEstado ?? p.entrega_estado ?? p.estado ?? 'pendiente',
      }));

      // ✅ si backend trae resumen, úsalo (más fiable)
      const pendientes =
        (s.resumen && Number.isFinite(s.resumen.pendientes))
          ? s.resumen.pendientes
          : usuarios.filter(x => x.estado === 'pendiente').length;

      const entregadas =
        (s.resumen && Number.isFinite(s.resumen.entregadas))
          ? s.resumen.entregadas
          : usuarios.filter(x => x.estado === 'entregada').length;

      return {
        sorteo_id: s.sorteoId ?? s.sorteo_id ?? s.id,
        sorteo_titulo: s.descripcion ?? s.sorteo_titulo ?? s.titulo ?? `Sorteo #${s.sorteoId ?? s.sorteo_id ?? s.id}`,
        sorteo_premio: s.premio ?? s.sorteo_premio ?? '',
        pendientes,
        entregadas,
        usuarios,
      };
    }).sort((a, b) => (b.pendientes - a.pendientes));
  }

  // Caso 2: ya viene agrupado por sorteo (usuarios/users)
  const looksGrouped = data.length > 0 && (data[0].usuarios || data[0].users);
  if (looksGrouped) {
    return data.map(s => {
      const usuariosRaw = s.usuarios || s.users || [];
      const usuarios = usuariosRaw.map(u => ({
        usuario_id: u.usuario_id ?? u.id ?? u.user_id,
        nombre: u.nombre ?? u.usuario ?? u.name ?? 'Sin nombre',
        email: u.email ?? '',
        telefono: u.telefono ?? u.phone ?? '',
        numeros: Array.isArray(u.numeros)
          ? u.numeros
          : (typeof u.numeros === 'string'
              ? u.numeros.split(',').map(x => x.trim()).filter(Boolean)
              : []),
        estado: u.estado ?? u.estado_entrega ?? u.entrega_estado ?? 'pendiente',
      }));

      const pendientes = usuarios.filter(x => x.estado === 'pendiente').length;
      const entregadas = usuarios.filter(x => x.estado === 'entregada').length;

      return {
        sorteo_id: s.sorteo_id ?? s.id,
        sorteo_titulo: s.descripcion ?? s.sorteo ?? s.titulo ?? `Sorteo #${s.sorteo_id ?? s.id}`,
        sorteo_premio: s.premio ?? '',
        pendientes,
        entregadas,
        usuarios,
      };
    });
  }

  // Caso 3: viene plano (filas). Agrupar por sorteo_id
  const map = new Map();
  for (const row of data) {
    const sorteo_id = row.sorteo_id ?? row.id_sorteo ?? row.sorteoId;
    if (!sorteo_id) continue;

    const key = String(sorteo_id);
    if (!map.has(key)) {
      map.set(key, {
        sorteo_id,
        sorteo_titulo: row.sorteo ?? row.descripcion ?? `Sorteo #${sorteo_id}`,
        sorteo_premio: row.premio ?? '',
        usuarios: [],
      });
    }

    const item = map.get(key);

    const u = {
      usuario_id: row.usuario_id ?? row.user_id,
      nombre: row.nombre ?? row.usuario ?? 'Sin nombre',
      email: row.email ?? '',
      telefono: row.telefono ?? '',
      numeros: Array.isArray(row.numeros)
        ? row.numeros
        : (row.numero ? [String(row.numero)] : (typeof row.numeros === 'string' ? row.numeros.split(',').map(x => x.trim()).filter(Boolean) : [])),
      estado: row.entrega_estado ?? row.estado ?? row.estado_entrega ?? 'pendiente',
    };

    item.usuarios.push(u);
  }

  const out = Array.from(map.values()).map(s => {
    const pendientes = s.usuarios.filter(x => x.estado === 'pendiente').length;
    const entregadas = s.usuarios.filter(x => x.estado === 'entregada').length;
    return { ...s, pendientes, entregadas };
  });

  out.sort((a, b) => (b.pendientes - a.pendientes));
  return out;
}

function sanitizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('57')) return digits;
  if (digits.length === 10) return `57${digits}`;
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    if (last10.length === 10) return `57${last10}`;
  }
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
    ...(u.numeros || []),
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

    if (usersFiltered.length === 0) continue;

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

      const left = document.createElement('div');
      left.className = 'user-left';

      const numerosTxt = (u.numeros && u.numeros.length)
        ? u.numeros.join(', ')
        : '—';

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
        btnWA.setAttribute('aria-disabled', 'true');
        btnWA.style.opacity = '.5';
        btnWA.style.pointerEvents = 'none';
      }

      const btnMail = document.createElement('a');
      btnMail.className = 'btn-mini';
      btnMail.textContent = 'Email';
      btnMail.href = u.email ? `mailto:${u.email}?subject=${encodeURIComponent('Siempre Gana — Entrega de cuenta')}` : '#';
      if (!u.email) {
        btnMail.setAttribute('aria-disabled', 'true');
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
          await marcarEntregada(sorteo.sorteo_id, u.usuario_id);
          toast('Marcado como entregada ✅');
          await refresh(true);
        } catch (err) {
          console.error(err);
          toast('No se pudo marcar. Revisa permisos.');
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

  if (!elAcordeon.children.length) {
    elEmpty.classList.remove('hidden');
  } else {
    elEmpty.classList.add('hidden');
  }
}

async function fetchSorteosCuentas() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/admin/cuentas/sorteos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 403) throw new Error('Forbidden: no autorizado');
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${txt}`);
  }

  const raw = await res.json();

  // ✅ importante: normalizamos con soporte a participantes/resumen
  const normalized = normalize(raw);

  // DEBUG rápido (puedes comentar luego)
  console.log('[CUENTAS] RAW:', raw);
  console.log('[CUENTAS] NORMALIZED:', normalized);

  return normalized;
}

async function marcarEntregada(sorteoId, usuarioId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/admin/cuentas/sorteos/${sorteoId}/usuarios/${usuarioId}/entregar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`PATCH error ${res.status}: ${txt}`);
  }

  return res.json();
}

async function refresh(silent = false) {
  const prevScroll = window.scrollY;

  if (!silent) {
    btnRefrescar && (btnRefrescar.disabled = true);
    btnRefrescar && (btnRefrescar.textContent = 'Actualizando...');
  }

  try {
    const data = await fetchSorteosCuentas();
    state.cache = data;
    render();
    window.scrollTo({ top: prevScroll });
  } finally {
    if (!silent) {
      btnRefrescar && (btnRefrescar.disabled = false);
      btnRefrescar && (btnRefrescar.textContent = '🔄 Refrescar');
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
