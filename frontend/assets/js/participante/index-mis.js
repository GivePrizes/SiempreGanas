// assets/js/participante/index-mis.js

const API_URL = window.API_URL || '';

const gridMisNumeros = document.getElementById('misNumeros');
const emptyState = document.getElementById('misNumerosEmpty');
const chips = document.querySelectorAll('.chip-filtro');
const toast = document.getElementById('toast');

let participaciones = [];
let filtroActual = 'todos';

// --- Toast sencillo reutilizable ---
function mostrarToast(msg) {
  if (!toast) {
    alert(msg);
    return;
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 200);
  }, 2200);
}

// --- Helpers de estado ---
function normalizarEstado(str) {
  return (str || '').toString().toLowerCase();
}

function esFinalizado(p) {
  const estadoSorteo = normalizarEstado(
    p.sorteo_estado || p.estado_sorteo || ''
  );
  const estado = normalizarEstado(p.estado);
  return (
    ['finalizado', 'cerrado', 'lleno'].includes(estadoSorteo) ||
    ['finalizado', 'ganador', 'perdedor'].includes(estado)
  );
}

// Render de UNA tarjeta de participación
function renderParticipacionCard(p) {
  const estado = normalizarEstado(p.estado);

  const sorteoDesc = p.sorteo_descripcion || p.sorteo || p.descripcion_sorteo || 'Sorteo';
  const premio = p.premio || p.sorteo_premio || 'Premio especial';
  const numeros = Array.isArray(p.numeros)
    ? p.numeros
    : Array.isArray(p.numeros_usuario)
    ? p.numeros_usuario
    : [];

  const imagen = p.sorteo_imagen_url || p.imagen_url || '';

  const valorTotal = Number(p.total || p.valor_total || p.monto || 0) || 0;
  const valorFormateado = valorTotal.toLocaleString('es-CO');

  // badge según estado
  let badgeClass = 'status-open';
  let badgeText = 'En juego';

  if (estado === 'pendiente') {
    badgeClass = 'status-pending';
    badgeText = 'Pendiente de revisión';
  } else if (estado === 'aprobado' || estado === 'aprobada') {
    badgeClass = 'status-open';
    badgeText = 'Aprobado';
  } else if (estado === 'rechazado' || estado === 'rechazada') {
    badgeClass = 'status-closed';
    badgeText = 'Rechazado';
  }

  if (esFinalizado(p)) {
    badgeClass = 'status-closed';
    badgeText = 'Sorteo finalizado';
  }

  const numerosTexto = numeros.length
    ? numeros.sort((a, b) => a - b).join(', ')
    : '—';

  // mensaje cortito
  let mensajeEstado = '';
  if (estado === 'pendiente') {
    mensajeEstado =
      'Tu comprobante está en revisión. Apenas se apruebe, tus números participarán en la ruleta.';
  } else if (estado === 'aprobado' || estado === 'aprobada') {
    mensajeEstado =
      'Tus números ya están aprobados. Cuando el sorteo se llene, pasarás a la ruleta.';
  } else if (estado === 'rechazado' || estado === 'rechazada') {
    mensajeEstado =
      'Este comprobante fue rechazado. Revisa el pago o contáctanos si tienes dudas.';
  } else if (esFinalizado(p)) {
    mensajeEstado =
      'Este sorteo ya terminó. Revisa las comunicaciones para ver la ruleta y el resultado.';
  } else {
    mensajeEstado = 'Participación registrada.';
  }

  const imagenHtml = imagen
    ? `<div class="sorteo-image"><img src="${imagen}" alt="Imagen sorteo ${sorteoDesc}"></div>`
    : '';

  // link principal (si tienes ruta distinta, solo ajusta aquí)
  const sorteoId = p.sorteo_id || p.sorteoId || p.id_sorteo;
  const urlSorteo = sorteoId ? `sorteo.html?id=${sorteoId}` : 'dashboard.html';

  return `
    <article class="sorteo-card" data-estado="${estado}" data-finalizado="${esFinalizado(p)}">
      ${imagenHtml}
      <div class="sorteo-content">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem;">
          <h3 class="sorteo-title">${sorteoDesc}</h3>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="sorteo-info">
          <span class="icon">🎁</span>
          <span>Premio: ${premio}</span>
        </div>

        <div class="sorteo-info">
          <span class="icon">🎟</span>
          <span>Tus números: ${numerosTexto}</span>
        </div>

        <div class="sorteo-info">
          <span class="icon">💵</span>
          <span>Valor total: $${valorFormateado}</span>
        </div>

        <p class="availability">
          ${mensajeEstado}
        </p>

        <div class="cta">
          <a href="${urlSorteo}" class="btn btn-secondary">
            Ver sorteo
          </a>
        </div>
      </div>
    </article>
  `;
}

// Render de TODAS las participaciones según el filtroActual
function renderLista() {
  if (!gridMisNumeros || !participaciones) return;

  // aplicar filtro
  let lista = participaciones;

  if (filtroActual === 'pendiente') {
    lista = participaciones.filter(
      (p) => normalizarEstado(p.estado) === 'pendiente'
    );
  } else if (filtroActual === 'finalizado') {
    lista = participaciones.filter((p) => esFinalizado(p));
  } else if (filtroActual === 'activo') {
    lista = participaciones.filter(
      (p) =>
        !esFinalizado(p) &&
        normalizarEstado(p.estado) !== 'rechazado' &&
        normalizarEstado(p.estado) !== 'rechazada'
    );
  }

  if (!lista.length) {
    gridMisNumeros.innerHTML = '';
    if (emptyState) emptyState.classList.remove('oculto');
    return;
  }

  if (emptyState) emptyState.classList.add('oculto');
  gridMisNumeros.innerHTML = lista.map(renderParticipacionCard).join('');
}

// Carga desde el backend
async function cargarMisNumeros() {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');

  if (!token || !rawUser) {
    location.href = '../index.html';
    return;
  }

  if (gridMisNumeros) {
    gridMisNumeros.innerHTML = '<p class="loading">Cargando tus participaciones...</p>';
  }

  try {
    // Ajusta el endpoint si en tu backend se llama distinto
    const res = await fetch(`${API_URL}/api/participante/misNumeros`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }

    const data = await res.json();
    participaciones = Array.isArray(data) ? data : [];

    if (!participaciones.length && emptyState) {
      emptyState.classList.remove('oculto');
      if (gridMisNumeros) gridMisNumeros.innerHTML = '';
    } else {
      renderLista();
    }
  } catch (err) {
    console.error('Error cargando mis números', err);
    if (gridMisNumeros) {
      gridMisNumeros.innerHTML =
        '<p class="error">No se pudieron cargar tus participaciones. Intenta más tarde.</p>';
    }
    mostrarToast('Error al cargar tus números.');
  }
}

// Filtros (chips)
function setupFiltros() {
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const estado = chip.getAttribute('data-estado') || 'todos';
      filtroActual = estado;

      chips.forEach((c) => c.classList.remove('chip-filtro--activo'));
      chip.classList.add('chip-filtro--activo');

      renderLista();
    });
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupFiltros();
  cargarMisNumeros();
});
