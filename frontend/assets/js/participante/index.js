// assets/js/participante/index.js

import { cargarMisNumerosResumen } from './misNumeros.js';
import { cargarProgresoBono } from '../bonus.js';

const API_URL = window.API_URL || ''; // viene de config.js

// ================================
// 👋 BIENVENIDA
// ================================
function setBienvenida() {
  const titulo = document.getElementById('tituloBienvenida');
  const subtitulo = document.getElementById('subtituloBienvenida');
  const raw = localStorage.getItem('user');
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    if (titulo) {
      const nombre = user.nombre || user.name || '';
      titulo.textContent = nombre ? `Hola ${nombre} 👋` : 'Hola 👋';
    }
    if (subtitulo && !subtitulo.textContent.trim()) {
      subtitulo.textContent =
        'Elige tus números, sube tu comprobante y deja que la ruleta haga su magia.';
    }
  } catch {
    console.warn('No se pudo parsear user de localStorage');
  }
}

// ================================
// 🎟️ SORTEOS
// ================================
function renderSorteoCard(s) {
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

  const estado = (s.estado || '').toString().toLowerCase();
  let badgeClass = 'status-open';
  let badgeText = 'En venta';

  if (porcentaje >= 100 || estado === 'lleno') {
    badgeClass = 'status-closed';
    badgeText = 'Listo para ruleta';
  } else if (porcentaje >= 80) {
    badgeClass = 'status-pending';
    badgeText = 'Casi lleno';
  } else if (porcentaje <= 15) {
    badgeText = 'Nuevo sorteo';
  }

  const disponibilidadTexto =
    porcentaje === 0
      ? 'Aún se están vendiendo números. Entra temprano y elige tus favoritos.'
      : porcentaje < 80
      ? `Ya se ha vendido el ${porcentaje}% del sorteo.`
      : porcentaje < 100
      ? 'Quedan pocos números. El sorteo está a un paso de la ruleta.'
      : 'Lleno. Espera la ruleta 🎰';

  return `
    <article class="sorteo-card">
      <div class="sorteo-image">${imagenHtml}</div>

      <div class="sorteo-content">
        <div class="sorteo-header-row">
          <h3 class="sorteo-title">${s.descripcion}</h3>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="sorteo-info">🎁 Premio: ${s.premio}</div>
        <div class="sorteo-info">💵 Precio: $${precioFormateado}</div>
        <div class="sorteo-info">🎟 ${vendidos} / ${total}</div>

        <div class="progress-container">
          <div class="progress-bar" style="width:${porcentaje}%"></div>
        </div>

        <p class="availability">${disponibilidadTexto}</p>

        <div class="cta">
          ${
            porcentaje >= 100 || estado === 'lleno'
              ? `<a class="btn btn-secondary" href="ruleta-live.html?sorteo=${s.id}">🎰 Ver ruleta</a>`
              : `<a class="btn btn-primary" href="sorteo.html?id=${s.id}">Adquirir acceso</a>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderSorteosActivos(lista) {
  const cont = document.getElementById('sorteosActivos');
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = '<p class="text-muted">No hay sorteos activos.</p>';
    return;
  }

  cont.innerHTML = lista.map(renderSorteoCard).join('');
}

async function cargarStatsSorteos() {
  const statSorteos = document.getElementById('statSorteosActivos');
  const statProxima = document.getElementById('statProxima');

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    if (!res.ok) throw new Error();

    const sorteos = await res.json();
    const activos = sorteos.filter(s =>
      ['activo', 'en curso', '', 'lleno'].includes(
        (s.estado || '').toLowerCase()
      )
    );

    if (statSorteos) statSorteos.textContent = activos.length;
    if (statProxima) statProxima.textContent = '—';
  } catch {
    if (statSorteos) statSorteos.textContent = '—';
    if (statProxima) statProxima.textContent = '—';
  }
}

async function cargarSorteosActivos() {
  const cont = document.getElementById('sorteosActivos');
  if (!cont) return;

  cont.innerHTML = '<p class="loading">Cargando sorteos...</p>';

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    if (!res.ok) throw new Error();

    const sorteos = await res.json();
    renderSorteosActivos(
      sorteos.filter(s => (s.estado || '').toLowerCase() !== 'finalizado')
    );
  } catch {
    cont.innerHTML =
      '<p class="error">No se pudieron cargar los sorteos.</p>';
  }
}

// ================================
// 🎁 BONUS DINÁMICO LOCAL
// ================================
function actualizarBonusDinamico(totalNumeros) {
  const el = document.getElementById('bonusHint');
  if (!el) return;

  const step = 20;
  const bonos = Math.floor(totalNumeros / step);
  const faltan = step - (totalNumeros % step || step);

  el.textContent =
    bonos > 0
      ? faltan === 0
        ? `✅ Bonus disponible (${bonos})`
        : `✅ ${bonos} bonus • faltan ${faltan}`
      : `Bonus: te faltan ${faltan}`;
}

// ================================
// 🚀 INIT
// ================================
document.addEventListener('DOMContentLoaded', async () => {
  setBienvenida();
  cargarStatsSorteos();
  cargarProgresoBono(); // ← SOLO importado
  await cargarMisNumerosResumen();

  const total = Number(
    (document.getElementById('statNumerosComprados')?.textContent || '0')
      .replace(/[^\d]/g, '')
  );

  actualizarBonusDinamico(total);
  cargarSorteosActivos();
});
