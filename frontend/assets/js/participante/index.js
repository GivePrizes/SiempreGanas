// assets/js/participante/index.js

import { cargarMisNumerosResumen } from './misNumeros.js';

const API_URL = window.API_URL || ''; // viene de config.js

function setBienvenida() {
  const titulo = document.getElementById('tituloBienvenida');
  const subtitulo = document.getElementById('subtituloBienvenida');
  const raw = localStorage.getItem('user');
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    if (titulo) {
      const nombre = user.nombre || user.name || '';
      titulo.textContent = nombre
        ? `Hola ${nombre} 👋`
        : 'Hola 👋';
    }
    if (subtitulo && !subtitulo.textContent.trim()) {
      subtitulo.textContent =
        'Elige tus números, sube tu comprobante y deja que la ruleta haga su magia.';
    }
  } catch (e) {
    console.warn('No se pudo parsear user de localStorage');
  }
}

/**
 * Renderiza el HTML de una card de sorteo usando las clases del CSS.
 */
function renderSorteoCard(s) {
  // El backend devuelve 'ocupados' y 'cantidad_numeros'
  const vendidos =
    s.ocupados ??
    s.numeros_vendidos ??
    s.ocupadosCount ??
    0;

  const total =
    s.cantidad_numeros ??
    s.total_numeros ??
    s.totalNumeros ??
    0;

  const porcentaje = total > 0 ? Math.round((vendidos / total) * 100) : 0;

  const imagenHtml = s.imagen_url
    ? `<img src="${s.imagen_url}" alt="Imagen sorteo ${s.descripcion}">`
    : `<span class="placeholder">Imagen por defecto</span>`;

  const precioNumero = Number(s.precio_numero ?? s.precio ?? 0) || 0;
  const precioFormateado = precioNumero.toLocaleString('es-CO');

  // --- Badge de estado / urgencia ---
  const estado = (s.estado || '').toString().toLowerCase();
  let badgeClass = '';
  let badgeText = '';

  if (porcentaje >= 100 || estado === 'lleno') {
    badgeClass = 'status-closed';
    badgeText = 'Listo para ruleta';
  } else if (porcentaje >= 80) {
    badgeClass = 'status-pending';
    badgeText = 'Casi lleno';
  } else if (porcentaje <= 15) {
    badgeClass = 'status-open';
    badgeText = 'Nuevo sorteo';
  } else {
    badgeClass = 'status-open';
    badgeText = 'En venta';
  }

  const disponibilidadTexto =
    porcentaje === 0
      ? 'Aún se están vendiendo números. Entra temprano y elige tus favoritos.'
      : porcentaje < 80
      ? `Ya se ha vendido el ${porcentaje}% del sorteo. Todavía tienes buena oportunidad.`
      : porcentaje < 100
      ? `Quedan pocos números. El sorteo está a un paso de la ruleta.`
      : 'Sorteo lleno. Espera la ruleta 🎰';

  return `
    <article class="sorteo-card">
      <div class="sorteo-image">
        ${imagenHtml}
      </div>

      <div class="sorteo-content">
        <div class="sorteo-header-row" style="display:flex; justify-content:space-between; align-items:center; gap:.5rem;">
          <h3 class="sorteo-title">${s.descripcion}</h3>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="sorteo-info">
          <span class="icon">🎁</span>
          <span>Premio: ${s.premio}</span>
        </div>

        <div class="sorteo-info">
          <span class="icon">💵</span>
          <span>Precio por número: $${precioFormateado}</span>
        </div>

        <div class="sorteo-info">
          <span class="icon">🎟</span>
          <span>Ocupación: ${vendidos} / ${total}</span>
        </div>

        <div class="progress-container">
          <div class="progress-bar" style="width: ${porcentaje}%;"></div>
        </div>

        <p class="availability">
          ${disponibilidadTexto}
        </p>

        <div class="cta">
          ${
            (estado === 'lleno' || porcentaje >= 100)
              ? `<a class="btn btn-secondary" href="ruleta-live.html?sorteo=${s.id}">🎰 Ver ruleta</a>`
              : `<a href="sorteo.html?id=${s.id}" class="btn btn-primary">Participar ahora</a>`
          }
        </div>

      </div>
    </article>
  `;
}

/**
 * Renderiza TODA la lista de sorteos dentro de #sorteosActivos
 */
function renderSorteosActivos(lista) {
  const cont = document.getElementById('sorteosActivos');
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML =
      '<p class="text-muted">Por ahora no hay sorteos activos.</p>';
    return;
  }

  cont.innerHTML = lista.map(renderSorteoCard).join('');
}

async function cargarStatsSorteos() {
  const statSorteos = document.getElementById('statSorteosActivos');
  const statProxima = document.getElementById('statProxima'); 

  if (!statSorteos && !statProxima) return;

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const sorteos = await res.json();
    if (!Array.isArray(sorteos)) throw new Error('Respuesta no es array');

    // Contar sorteos activos (según tu modelo)
    const activos = sorteos.filter((s) => {
      const estado = (s.estado || '').toString().toLowerCase();
      return ['activo', 'en curso', '', 'lleno'].includes(estado);
    });

    if (statSorteos) {
      statSorteos.textContent = activos.length.toString();
    }

    // Próxima ruleta (si tu backend tiene fecha de sorteo)
    if (statProxima) {
      const conFecha = sorteos
        .map((s) => ({
          ...s,
          fecha: s.fecha_sorteo || s.fecha || null,
        }))
        .filter((s) => s.fecha);

      if (conFecha.length === 0) {
        statProxima.textContent = '—';
      } else {
        const ahora = new Date();
        const futuros = conFecha
          .map((s) => ({ ...s, fechaObj: new Date(s.fecha) }))
          .filter((s) => s.fechaObj > ahora)
          .sort((a, b) => a.fechaObj - b.fechaObj);

        if (futuros.length === 0) {
          statProxima.textContent = '—';
        } else {
          const prox = futuros[0].fechaObj;
          statProxima.textContent = prox.toLocaleDateString();
        }
      }
    }
  } catch (err) {
    console.error('Error cargando stats sorteos', err);
    if (statSorteos) statSorteos.textContent = '—';
    if (statProxima) statProxima.textContent = '—';
  }
}

async function cargarSorteosActivos() {
  const contenedor = document.getElementById('sorteosActivos');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="loading">Cargando sorteos...</p>';

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const sorteos = await res.json();

    // Solo mostrar sorteos disponibles para compra
    const disponibles = sorteos.filter((s) => {
      const estado = (s.estado || '').toString().toLowerCase();
      // mostramos activos + llenos (esperando ruleta)
      if (estado === 'finalizado') return false; // finalizado sí lo ocultamos aquí
      return true;
    });


    renderSorteosActivos(disponibles);
  } catch (err) {
    console.error('Error cargando sorteos activos', err);
    contenedor.innerHTML =
      '<p class="error">No se pudieron cargar los sorteos. Intenta más tarde.</p>';
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  setBienvenida();
  cargarStatsSorteos();
  cargarMisNumerosResumen();
  cargarSorteosActivos();
});
