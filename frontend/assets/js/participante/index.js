// assets/js/participante/index.js

import { cargarMisNumerosResumen } from './misNumeros.js';
import { cargarProgresoBono } from '../bonus.js';

const API_URL = window.API_URL || '';

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
    const nombre = user.nombre || user.name || '';
    if (titulo) titulo.textContent = nombre ? `Hola ${nombre} 👋` : 'Hola 👋';
    if (subtitulo)
      subtitulo.textContent =
        'Adquiere tus números, sube tu comprobante y espera la dinámica.';
  } catch {
    console.warn('User inválido en localStorage');
  }
}

// ================================
// 🎟️ TARJETAS DE SORTEO
// ================================
function renderSorteoCard(s) {
  const vendidos = s.ocupados ?? s.numeros_vendidos ?? 0;
  const total = s.cantidad_numeros ?? s.total_numeros ?? 0;
  const porcentaje = total ? Math.round((vendidos / total) * 100) : 0;

  const imagen = s.imagen_url
    ? `<img src="${s.imagen_url}" alt="${s.descripcion}">`
    : `<span class="placeholder">Imagen</span>`;

  const precio = Number(s.precio_numero ?? s.precio ?? 0).toLocaleString('es-CO');

  let estadoTxt = 'En venta';
  let estadoClass = 'status-open';

  if (porcentaje >= 100) {
    estadoTxt = 'Listo para ruleta';
    estadoClass = 'status-closed';
  } else if (porcentaje >= 80) {
    estadoTxt = 'Casi lleno';
    estadoClass = 'status-pending';
  }

  return `
    <article class="sorteo-card">
      <div class="sorteo-image">${imagen}</div>

      <div class="sorteo-content">
        <div class="sorteo-header-row">
          <h3 class="sorteo-title">${s.descripcion}</h3>
          <span class="status-badge ${estadoClass}">${estadoTxt}</span>
        </div>

        <div class="sorteo-info">🎁 Premio: ${s.premio}</div>
        <div class="sorteo-info">💵 Precio: $${precio}</div>
        <div class="sorteo-info">🎟 ${vendidos} / ${total}</div>

        <div class="progress-container">
          <div class="progress-bar" style="width:${porcentaje}%"></div>
        </div>

        <div class="cta">
          ${
            porcentaje >= 100
              ? `<a class="btn btn-secondary" href="ruleta-live.html?sorteo=${s.id}">🎰 Ver ruleta</a>`
              : `<a class="btn btn-primary" href="sorteo.html?id=${s.id}">Adquirir acceso</a>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderSorteos(lista) {
  const cont = document.getElementById('sorteosActivos');
  if (!cont) return;

  cont.innerHTML = lista.length
    ? lista.map(renderSorteoCard).join('')
    : '<p class="text-muted">No hay sorteos activos.</p>';
}

// ================================
// 📊 STATS
// ================================
async function cargarStatsSorteos() {
  const el = document.getElementById('statSorteosActivos');

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    const data = await res.json();
    const count = data.filter(s => s.estado !== 'finalizado').length;
    el.textContent = String(count);
    el.style.opacity = '1';
  } catch {
    // Error: mostrar 0 atenuado, no guión
    if (el) {
      el.textContent = '0';
      el.style.opacity = '0.5';
    }
  }
}

async function cargarSorteosActivos() {
  const cont = document.getElementById('sorteosActivos');
  cont.innerHTML = '<p class="loading">Cargando sorteos…</p>';

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    const data = await res.json();
    renderSorteos(data.filter(s => s.estado !== 'finalizado'));
  } catch {
    cont.innerHTML = '<p class="error">No se pudieron cargar los sorteos.</p>';
  }
}

// ================================
// 🚀 INIT
// ================================
document.addEventListener('DOMContentLoaded', async () => {
  setBienvenida();
  cargarStatsSorteos();

  // 🔹 Esto llena “Números adquiridos”
  await cargarMisNumerosResumen();

  // 🔹 SOLO esto maneja el bonus (mini o grande)
  cargarProgresoBono();

  cargarSorteosActivos();
});
