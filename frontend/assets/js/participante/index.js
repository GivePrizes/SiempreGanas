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

async function cargarStatsSorteos() {
  const statSorteos = document.getElementById('statSorteosActivos');
  const statProxima = document.getElementById('statProximaRuleta');

  if (!statSorteos && !statProxima) return;

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const sorteos = await res.json();
    if (!Array.isArray(sorteos)) throw new Error('Respuesta no es array');

    // Contar sorteos activos (según tu modelo)
    const activos = sorteos.filter((s) => {
      const estado = (s.estado || '').toString().toLowerCase();
      return estado === 'activo' || estado === 'en curso' || estado === '';
    });

    if (statSorteos) {
      statSorteos.textContent = activos.length.toString();
    }

    // Próxima ruleta (si tu backend tiene alguna fecha de sorteo)
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
        // Tomar la fecha más cercana en el futuro
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
    if (!Array.isArray(sorteos) || sorteos.length === 0) {
      contenedor.innerHTML =
        '<p class="empty">Todavía no hay sorteos activos.</p>';
      return;
    }

    contenedor.innerHTML = '';

    sorteos.forEach((s) => {
      const total =
        s.cantidad_numeros ??
        s.total_numeros ??
        s.totalNumeros ??
        0;
      const ocupados =
        s.ocupados ??
        s.numeros_ocupados ??
        s.ocupadosCount ??
        0;

      const porcentaje =
        total > 0 ? Math.round((ocupados / total) * 100) : 0;
      const restantes = total > 0 ? total - ocupados : 0;

      const card = document.createElement('article');
      card.className = 'sorteo-card';

      const imagenHtml = s.imagen_url
        ? `<img src="${s.imagen_url}" alt="Imagen del sorteo ${s.descripcion}">`
        : `<span class="placeholder">Imagen por defecto</span>`;

      card.innerHTML = `
        <div class="sorteo-image">
          ${imagenHtml}
        </div>
        <div class="sorteo-content">
          <h3 class="sorteo-title">${s.descripcion}</h3>

          <div class="sorteo-info">
            <span class="icon">🎁</span>
            <span>Premio: ${s.premio}</span>
          </div>

          <div class="sorteo-info">
            <span class="icon">💵</span>
            <span>Precio por número: $${s.precio_numero ?? s.precio ?? 0}</span>
          </div>

          <div class="progress-container">
            <div class="progress-bar" style="width:${porcentaje}%;"></div>
          </div>

          <p class="availability">
            ${ocupados} de ${total} números vendidos ·
            Quedan ${restantes}
          </p>

          <div class="cta">
            <a href="sorteo.html?id=${s.id}" class="btn btn-primary">
              Participar ahora
            </a>
          </div>
        </div>
      `;

      contenedor.appendChild(card);
    });
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
