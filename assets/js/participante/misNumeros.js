// assets/js/participante/misNumeros.js

const API_URL = window.API_URL; // viene de config.js

let __MIS_ROWS__ = [];   // filas crudas del backend (1 por participacion)
let __MIS_GRUPOS__ = []; // grupos (1 por sorteo)
let __MIS_STATE_MAP__ = loadStateMap(); // estado anterior por sorteo/numero
let __MIS_CHANGED_SET__ = new Set();
let __MIS_TOAST_TIMER__ = null;

const MIS_STATE_STORAGE_KEY = 'mathome:mis-numeros:estado:v1';

function norm(x) {
  return (x || '').toString().toLowerCase().trim();
}

function loadStateMap() {
  try {
    const raw = sessionStorage.getItem(MIS_STATE_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return new Map();
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function persistStateMap(map) {
  try {
    const serializable = Object.fromEntries(map.entries());
    sessionStorage.setItem(MIS_STATE_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // noop
  }
}

function ensureToastElement() {
  let el = document.getElementById('toast');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'toast';
  el.className = 'toast hidden';
  el.textContent = 'Accion realizada';
  document.body.appendChild(el);
  return el;
}

function mostrarToast(msg) {
  const toast = ensureToastElement();
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.remove('hidden');

  if (__MIS_TOAST_TIMER__) {
    clearTimeout(__MIS_TOAST_TIMER__);
  }

  __MIS_TOAST_TIMER__ = window.setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

function syncStateMap(rows) {
  const nextMap = new Map();
  const changedSet = new Set();
  const transitions = {
    aprobados: [],
    rechazados: [],
  };

  rows.forEach((row) => {
    const key = `${row.sorteo_id}:${row.numero}`;
    const nextEstado = norm(row.estado);
    const prevEstado = __MIS_STATE_MAP__.get(key);

    nextMap.set(key, nextEstado);

    if (!prevEstado || prevEstado === nextEstado) return;

    changedSet.add(key);

    const payload = {
      sorteoId: row.sorteo_id,
      descripcion: row.descripcion,
      numero: row.numero,
      previous: prevEstado,
      next: nextEstado,
    };

    if (nextEstado === 'aprobado') {
      transitions.aprobados.push(payload);
      return;
    }

    if (nextEstado === 'rechazado') {
      transitions.rechazados.push(payload);
    }
  });

  __MIS_STATE_MAP__ = nextMap;
  __MIS_CHANGED_SET__ = changedSet;
  persistStateMap(nextMap);

  return { changedSet, transitions };
}

function buildTransitionToastMessage(transitions) {
  const aprobados = Array.isArray(transitions?.aprobados) ? transitions.aprobados : [];
  const rechazados = Array.isArray(transitions?.rechazados) ? transitions.rechazados : [];

  if (!aprobados.length && !rechazados.length) return '';

  const mensajes = [];

  if (aprobados.length === 1) {
    const item = aprobados[0];
    mensajes.push(
      `Tu participacion en "${item.descripcion}" ya fue aprobada.`
    );
  } else if (aprobados.length > 1) {
    mensajes.push(`Se aprobaron ${aprobados.length} pagos en tus participaciones.`);
  }

  if (rechazados.length === 1) {
    const item = rechazados[0];
    mensajes.push(
      `Tu participacion en "${item.descripcion}" fue rechazada.`
    );
  } else if (rechazados.length > 1) {
    mensajes.push(`Se rechazaron ${rechazados.length} pagos en tus participaciones.`);
  }

  return mensajes.join(' ');
}

function estadoTexto(e) {
  const v = norm(e);
  if (v === 'aprobado') return 'Aprobada';
  if (v === 'pendiente') return 'Pendiente';
  if (v === 'rechazado') return 'Rechazada';
  return '—';
}

function chipClass(e) {
  const v = norm(e);
  if (v === 'aprobado') return 'num-chip chip-ok';
  if (v === 'pendiente') return 'num-chip chip-warn';
  if (v === 'rechazado') return 'num-chip chip-bad';
  return 'num-chip';
}

function agruparPorSorteo(rows) {
  const grupos = {};

  rows.forEach((p) => {
    const sorteoId = p.sorteo_id;

    if (!grupos[sorteoId]) {
      grupos[sorteoId] = {
        sorteo_id: sorteoId,
        descripcion: p.descripcion,
        premio: p.premio,
        modalidad: p.modalidad,
        sorteo_estado: p.sorteo_estado,
        ruleta_estado: p.ruleta_estado,
        numero_ganador: p.numero_ganador,
        numeros: [], // [{numero, estado}]
        aprobados: 0,
        pendientes: 0,
        rechazados: 0,
      };
    }

    const g = grupos[sorteoId];
    const estado = norm(p.estado);

    g.numeros.push({ numero: Number(p.numero), estado });

    if (estado === 'aprobado') g.aprobados += 1;
    else if (estado === 'pendiente') g.pendientes += 1;
    else if (estado === 'rechazado') g.rechazados += 1;
  });

  return Object.values(grupos).map((g) => {
    g.numeros = (g.numeros || []).slice().sort((a, b) => a.numero - b.numero);
    return g;
  });
}

function renderGrupos(grupos, changedSet = new Set()) {
  const contenedor = document.getElementById('misNumeros');
  const emptyBox = document.getElementById('misNumerosEmpty');

  if (!contenedor) return;

  if (!grupos || grupos.length === 0) {
    contenedor.innerHTML = '';
    if (emptyBox) emptyBox.classList.remove('oculto');
    return;
  }

  if (emptyBox) emptyBox.classList.add('oculto');
  contenedor.innerHTML = '';

  grupos.forEach((grupo) => {
    const card = document.createElement('article');
    card.className = 'sorteo-card';

    const sorteoEstado = norm(grupo.sorteo_estado);
    const modalidad = norm(grupo.modalidad);
    const ruletaEstado = norm(grupo.ruleta_estado);
    const liveReady =
      modalidad === 'live' &&
      (
        sorteoEstado === 'lleno' ||
        sorteoEstado === 'finalizado' ||
        ruletaEstado === 'programada' ||
        ruletaEstado === 'girando' ||
        ruletaEstado === 'finalizada'
      );
    const pillSorteo =
      sorteoEstado === 'finalizado'
        ? `<span class="badge badge-danger">Finalizado</span>`
        : sorteoEstado === 'lleno'
          ? `<span class="badge badge-warning">Listo para vivo</span>`
          : `<span class="badge badge-success">Activo</span>`;

    const ganadorHtml =
      sorteoEstado === 'finalizado' && grupo.numero_ganador != null
        ? `<p class="resumen-linea"><strong>Participacion ganadora:</strong> <span>#${grupo.numero_ganador}</span></p>`
        : '';

    const chipsHtml =
      grupo.numeros && grupo.numeros.length
        ? grupo.numeros
            .map((it) => {
              const isWinner =
                sorteoEstado === 'finalizado' &&
                grupo.numero_ganador != null &&
                Number(grupo.numero_ganador) === Number(it.numero);

              const winnerMark = isWinner ? ' ⭐' : '';
              const winnerClass = isWinner ? ' chip-winner' : '';
              const key = `${grupo.sorteo_id}:${it.numero}`;
              const changedClass = changedSet.has(key) ? ' chip-soft-update' : '';

              return `
                <span class="${chipClass(it.estado)}${winnerClass}${changedClass}">
                  #${it.numero}${winnerMark}
                  <small>${estadoTexto(it.estado)}</small>
                </span>
              `;
            })
            .join('')
        : '<span class="text-muted">—</span>';

    const badges = [];
    if (grupo.aprobados) badges.push(`<span class="badge badge-success">Aprobadas: ${grupo.aprobados}</span>`);
    if (grupo.pendientes) badges.push(`<span class="badge badge-warning">En revision: ${grupo.pendientes}</span>`);
    if (grupo.rechazados) badges.push(`<span class="badge badge-danger">Rechazadas: ${grupo.rechazados}</span>`);

    const ctaHref = `ruleta-live.html?id=${grupo.sorteo_id}`;
    const ctaLabel = sorteoEstado === 'finalizado'
      ? 'Ver resultado en vivo'
      : liveReady
        ? 'Entrar al vivo'
        : 'Ir a la sala';

    card.innerHTML = `
      <div class="sorteo-content">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
          <div>
            <h3 class="sorteo-title">${grupo.descripcion}</h3>
            <p class="text-muted">Premio: ${grupo.premio}</p>
          </div>
          <div>${pillSorteo}</div>
        </div>

        ${ganadorHtml}

        <p class="resumen-linea"><strong>Tus participaciones:</strong></p>
        <div class="numeros-chips-wrap">${chipsHtml}</div>

        <p class="resumen-linea">
          ${badges.length ? badges.join(' ') : '<span class="text-muted">Sin estado registrado</span>'}
        </p>

        <div class="cta cta-mis-numeros">
          <a href="${ctaHref}" class="btn btn-primary">
            ${ctaLabel}
          </a>
        </div>
      </div>
    `;

    contenedor.appendChild(card);
  });
}

function aplicarFiltro(estado) {
  const e = norm(estado);

  if (e === 'todos') return __MIS_GRUPOS__;

  if (e === 'activo') {
    return __MIS_GRUPOS__.filter((g) => norm(g.sorteo_estado) !== 'finalizado');
  }

  if (e === 'finalizado') {
    return __MIS_GRUPOS__.filter((g) => norm(g.sorteo_estado) === 'finalizado');
  }

  // “pendiente”: al menos un número pendiente dentro del sorteo
  if (e === 'pendiente') {
    return __MIS_GRUPOS__.filter((g) =>
      (g.numeros || []).some((n) => norm(n.estado) === 'pendiente')
    );
  }

  return __MIS_GRUPOS__;
}

// ✅ filtros internos sin recargar página (lo llaman tus chips)
window.filtrarMisNumeros = (estado) => {
  renderGrupos(aplicarFiltro(estado), __MIS_CHANGED_SET__);
};

// ------------------------------
// ✅ RESUMEN (dashboard)
// ------------------------------
export async function cargarMisNumerosResumen() {
  const token = localStorage.getItem('token');
  const stat = document.getElementById('statNumerosComprados');

  if (!token) return { totalNumeros: 0 };

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error('Error HTTP en mis-participaciones (resumen):', res.status);
      // No mostrar guión, solo ocultar
      if (stat) stat.style.opacity = '0.5';
      return { totalNumeros: 0 };
    }

    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    const totalNumeros = rows.length;
    const { transitions } = syncStateMap(rows);

    if (stat) {
      stat.textContent = String(totalNumeros);
      stat.style.opacity = '1';
    }

    const transitionMessage = buildTransitionToastMessage(transitions);
    if (transitionMessage) {
      mostrarToast(transitionMessage);
    }

    //  CLAVE: devolver el total
    return { totalNumeros };
  } catch (err) {
    console.error(err);
    // No mostrar guión, solo ocultar el contenido
    if (stat) stat.style.opacity = '0.5';
    return { totalNumeros: 0 };
  }
}


// ------------------------------
// ✅ DETALLE (mis-numeros.html)
// ------------------------------
export async function cargarMisNumerosDetalle({ silent = false } = {}) {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('misNumeros');
  const emptyBox = document.getElementById('misNumerosEmpty');

  if (!token || !contenedor) return;

  if (!silent) {
    if (emptyBox) emptyBox.classList.add('oculto');
    contenedor.innerHTML = '<p class="loading">Cargando tus participaciones...</p>';
  }

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error('Error HTTP en mis-participaciones (detalle):', res.status);
      if (!silent) {
        contenedor.innerHTML =
          '<p class="error">No se pudieron cargar tus participaciones. Intenta mas tarde.</p>';
      }
      return;
    }

    const data = await res.json();
    __MIS_ROWS__ = Array.isArray(data) ? data : [];
    __MIS_GRUPOS__ = agruparPorSorteo(__MIS_ROWS__);
    const { changedSet, transitions } = syncStateMap(__MIS_ROWS__);

    if (!__MIS_GRUPOS__.length) {
      if (!silent) {
        contenedor.innerHTML = '';
        if (emptyBox) emptyBox.classList.remove('oculto');
      }
      return;
    }

    const transitionMessage = buildTransitionToastMessage(transitions);
    if (transitionMessage) {
      mostrarToast(transitionMessage);
    }

    renderGrupos(__MIS_GRUPOS__, changedSet);
  } catch (err) {
    console.error(err);
    if (!silent) {
      contenedor.innerHTML =
        '<p class="error">Error de conexion al cargar tus participaciones.</p>';
    }
  }
}





