// assets/js/participante/index.js

import { cargarMisNumerosResumen } from './misNumeros.js';
import { cargarProgresoBono } from '../bonus.js';

const API_URL = window.API_URL || '';
const SORTEO_TIPO_DEFAULT = 'pantalla';
const state = {
  sorteoTipo: 'todos',
  sorteos: [],
};

function normalizarTipoProducto(value) {
  return value === 'combo' ? 'combo' : SORTEO_TIPO_DEFAULT;
}

function getTipoProductoLabel(value) {
  return normalizarTipoProducto(value) === 'combo' ? 'Combo' : 'Pantalla';
}

// ================================
// 👋 BIENVENIDA
// ================================
function setBienvenida(user) {
  const titulo = document.getElementById('tituloBienvenida');
  const subtitulo = document.getElementById('subtituloBienvenida');
  if (!user) return;

  const nombre = user.nombre || user.alias || user.email || '';
  if (titulo) titulo.textContent = nombre ? `Hola ${nombre} 👋` : 'Hola 👋';
  if (subtitulo)
    subtitulo.textContent =
      'Adquiere tus números, sube tu comprobante y espera la dinámica.';
}

// ================================
// 🎟️ TARJETAS DE SORTEO
// ================================
function renderSorteoCard(s) {
  const vendidos = s.ocupados ?? s.numeros_vendidos ?? 0;
  const total = s.cantidad_numeros ?? s.total_numeros ?? 0;
  const porcentaje = total ? Math.round((vendidos / total) * 100) : 0;
  const tipoProducto = normalizarTipoProducto(s.tipo_producto);
  const tipoLabel = getTipoProductoLabel(tipoProducto);

  const imagen = s.imagen_url
    ? `<img src="${s.imagen_url}" alt="${s.descripcion}">`
    : `<span class="placeholder">Imagen</span>`;

  const precio = Number(s.precio_numero ?? s.precio ?? 0).toLocaleString('es-CO');

  let estadoTxt = 'En venta';
  let estadoClass = 'status-open';

  if (porcentaje >= 100) {
    estadoTxt = 'Listo para resultado en vivo';
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
          <div class="sorteo-badges-row">
            <span class="sorteo-type-badge sorteo-type-badge--${tipoProducto}">${tipoLabel}</span>
            <span class="status-badge ${estadoClass}">${estadoTxt}</span>
          </div>
        </div>

        <div class="sorteo-info">🎁 Ganador: ${s.premio}</div>
        <div class="sorteo-info">💵 Precio: $${precio}</div>
        <div class="sorteo-info">🎟 ${vendidos} / ${total}</div>

        <div class="progress-container">
          <div class="progress-bar" style="width:${porcentaje}%"></div>
        </div>

        <div class="cta">
          ${
            porcentaje >= 100
              ? `<a class="btn btn-secondary" href="ruleta-live.html?id=${s.id}">🎰 Ver sorteo en vivo</a>`
              : `<a class="btn btn-primary" href="sorteo.html?id=${s.id}">Participar ahora</a>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderSorteos(lista, tipoActivo = 'todos') {
  const cont = document.getElementById('sorteosActivos');
  if (!cont) return;

  const filtrados = tipoActivo === 'todos'
    ? lista
    : lista.filter(s => normalizarTipoProducto(s.tipo_producto) === tipoActivo);

  if (!filtrados.length) {
    const emptyText = tipoActivo === 'combo'
      ? 'Ahora mismo no hay combos activos. Pronto aparecerán aquí.'
      : tipoActivo === 'pantalla'
        ? 'Ahora mismo no hay pantallas activas. Pronto aparecerán aquí.'
        : 'No hay sorteos activos.';

    cont.innerHTML = `<p class="text-muted">${emptyText}</p>`;
    return;
  }

  cont.innerHTML = filtrados.map(renderSorteoCard).join('');
}

function updateTipoSorteoUI() {
  const chips = document.querySelectorAll('[data-tipo-sorteo]');
  chips.forEach(chip => {
    const activo = chip.dataset.tipoSorteo === state.sorteoTipo;
    chip.classList.toggle('chip-filtro--activo', activo);
  });
}

function renderSorteosView() {
  renderSorteos(state.sorteos, state.sorteoTipo);
  updateTipoSorteoUI();
}

function initTipoSorteoFiltros() {
  const cont = document.getElementById('tipoSorteoFiltros');
  if (!cont) return;

  cont.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-tipo-sorteo]');
    if (!btn) return;

    state.sorteoTipo = btn.dataset.tipoSorteo || 'todos';
    renderSorteosView();
  });
}

// ================================
// 📊 STATS
// ================================
async function cargarStatsSorteos() {
  const el = document.getElementById('statSorteosActivos');
  const note = document.getElementById('statSorteosNota');

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    const data = await res.json();
    const count = data.filter(s => s.estado !== 'finalizado').length;
    el.textContent = String(count);
    el.style.opacity = '1';

    if (note) {
      if (count <= 0) {
        note.textContent = 'Dato curioso: cuando una ronda se active, podrás seguir el giro desde el primer minuto.';
      } else if (count === 1) {
        note.textContent = 'Dato curioso: seguir tu ronda activa te ayuda a no perder el momento clave del giro.';
      } else {
        note.textContent = `Dato curioso: hoy tienes ${count} rondas activas para seguir y aumentar tus oportunidades.`;
      }
    }
  } catch {
    // Error: mostrar 0 atenuado, no guión
    if (el) {
      el.textContent = '0';
      el.style.opacity = '0.5';
    }
    if (note) {
      note.textContent = 'Dato curioso: cada ronda en vivo te acerca al próximo resultado destacado.';
    }
  }
}

async function cargarSorteosActivos() {
  const cont = document.getElementById('sorteosActivos');
  cont.innerHTML = '<p class="loading">Cargando sorteos…</p>';

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    const data = await res.json();
    state.sorteos = data.filter(s => s.estado !== 'finalizado');
    renderSorteosView();
  } catch {
    state.sorteos = [];
    cont.innerHTML = '<p class="error">No se pudieron cargar las rondas.</p>';
  }
}

// ================================
// 🚀 INIT
// ================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../index.html' })
    : null;
  if (!user) return;

  setBienvenida(user);
  initTipoSorteoFiltros();
  cargarStatsSorteos();

  // 🔹 Esto llena “Números adquiridos”
  await cargarMisNumerosResumen();

  // 🔹 SOLO esto maneja el bonus (mini o grande)
  cargarProgresoBono();

  cargarSorteosActivos();
});







