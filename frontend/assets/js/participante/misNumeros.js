// assets/js/participante/misNumeros.js

const API_URL = window.API_URL; // viene de config.js

let __MIS_ROWS__ = [];   // filas crudas del backend (1 por número)
let __MIS_GRUPOS__ = []; // grupos (1 por sorteo)

function norm(x) {
  return (x || '').toString().toLowerCase().trim();
}

function estadoTexto(e) {
  const v = norm(e);
  if (v === 'aprobado') return 'Pagado';
  if (v === 'pendiente') return 'Pendiente';
  if (v === 'rechazado') return 'Rechazado';
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
        sorteo_estado: p.sorteo_estado,
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

function renderGrupos(grupos) {
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
    const pillSorteo =
      sorteoEstado === 'finalizado'
        ? `<span class="badge badge-danger">Finalizado</span>`
        : `<span class="badge badge-success">Activo</span>`;

    const ganadorHtml =
      sorteoEstado === 'finalizado' && grupo.numero_ganador != null
        ? `<p class="resumen-linea"><strong>Ganador:</strong> <span>#${grupo.numero_ganador}</span></p>`
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

              return `
                <span class="${chipClass(it.estado)}${winnerClass}">
                  #${it.numero}${winnerMark}
                  <small>${estadoTexto(it.estado)}</small>
                </span>
              `;
            })
            .join('')
        : '<span class="text-muted">—</span>';

    const badges = [];
    if (grupo.aprobados) badges.push(`<span class="badge badge-success">Pagados: ${grupo.aprobados}</span>`);
    if (grupo.pendientes) badges.push(`<span class="badge badge-warning">Pendientes: ${grupo.pendientes}</span>`);
    if (grupo.rechazados) badges.push(`<span class="badge badge-danger">Rechazados: ${grupo.rechazados}</span>`);

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

        <p class="resumen-linea"><strong>Números:</strong></p>
        <div class="numeros-chips-wrap">${chipsHtml}</div>

        <p class="resumen-linea">
          ${badges.length ? badges.join(' ') : '<span class="text-muted">Sin estado registrado</span>'}
        </p>

        <div class="cta cta-mis-numeros">
          <a href="sorteo.html?id=${grupo.sorteo_id}" class="btn btn-primary">
            Ver sorteo
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
  renderGrupos(aplicarFiltro(estado));
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
    const totalNumeros = Array.isArray(data) ? data.length : 0;

    if (stat) {
      stat.textContent = String(totalNumeros);
      stat.style.opacity = '1';
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
export async function cargarMisNumerosDetalle() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('misNumeros');
  const emptyBox = document.getElementById('misNumerosEmpty');

  if (!token || !contenedor) return;

  if (emptyBox) emptyBox.classList.add('oculto');
  contenedor.innerHTML = '<p class="loading">Cargando tus participaciones...</p>';

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error('Error HTTP en mis-participaciones (detalle):', res.status);
      contenedor.innerHTML =
        '<p class="error">No se pudieron cargar tus números. Intenta más tarde.</p>';
      return;
    }

    const data = await res.json();
    __MIS_ROWS__ = Array.isArray(data) ? data : [];
    __MIS_GRUPOS__ = agruparPorSorteo(__MIS_ROWS__);

    if (!__MIS_GRUPOS__.length) {
      contenedor.innerHTML = '';
      if (emptyBox) emptyBox.classList.remove('oculto');
      return;
    }

    renderGrupos(__MIS_GRUPOS__);
  } catch (err) {
    console.error(err);
    contenedor.innerHTML =
      '<p class="error">Error de conexión al cargar tus números.</p>';
  }
}
