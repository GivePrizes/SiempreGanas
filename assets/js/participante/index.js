import { cargarMisNumerosResumen } from './misNumeros.js';
import { cargarProgresoBono } from '../bonus.js';

const API_URL = window.API_URL || '';
const SORTEO_TIPO_DEFAULT = 'pantalla';
const VALID_TIPOS = new Set(['todos', 'pantalla', 'combo', 'juegos']);
const VALID_ESTADOS = new Set(['todos', 'comprables', 'casi_lleno', 'vivo']);
const VALID_ORDENES = new Set(['destacados', 'avance', 'precio_bajo', 'ultimos_cupos']);

const dom = {
  sorteoGrid: document.getElementById('sorteosActivos'),
  searchInput: document.getElementById('sorteoSearchInput'),
  sortSelect: document.getElementById('sorteoSortSelect'),
  tipoFiltros: document.getElementById('tipoSorteoFiltros'),
  estadoFiltros: document.getElementById('estadoSorteoFiltros'),
  resultadosInfo: document.getElementById('sorteosResultadosInfo'),
  paginaInfo: document.getElementById('sorteosPaginaInfo'),
  emptyState: document.getElementById('sorteosEmptyState'),
  emptyTitle: document.getElementById('sorteosEmptyTitle'),
  emptyText: document.getElementById('sorteosEmptyText'),
  resetFilters: document.getElementById('resetSorteosFilters'),
  pagination: document.getElementById('sorteosPagination'),
  prevPage: document.getElementById('sorteosPrevPage'),
  nextPage: document.getElementById('sorteosNextPage'),
  pageNumbers: document.getElementById('sorteosPageNumbers'),
  statSorteosActivos: document.getElementById('statSorteosActivos'),
  statSorteosNota: document.getElementById('statSorteosNota'),
};

const state = {
  sorteoTipo: 'todos',
  sorteoEstado: 'todos',
  search: '',
  sort: 'destacados',
  currentPage: 1,
  sorteos: [],
};

let currentItemsPerPage = getItemsPerPage();

function getItemsPerPage() {
  if (window.matchMedia('(max-width: 640px)').matches) return 4;
  return 6;
}

function sanitizePage(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function sanitizeFilter(value, validValues, fallback) {
  return validValues.has(value) ? value : fallback;
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readInitialDashboardState() {
  const params = new URLSearchParams(window.location.search);

  state.sorteoTipo = sanitizeFilter(
    params.get('tipo') || 'todos',
    VALID_TIPOS,
    'todos'
  );
  state.sorteoEstado = sanitizeFilter(
    params.get('estado') || 'todos',
    VALID_ESTADOS,
    'todos'
  );
  state.sort = sanitizeFilter(
    params.get('orden') || 'destacados',
    VALID_ORDENES,
    'destacados'
  );
  state.search = String(params.get('q') || '').trim();
  state.currentPage = sanitizePage(params.get('page'));
}

function syncDashboardStateToUrl() {
  const params = new URLSearchParams();

  if (state.sorteoTipo !== 'todos') params.set('tipo', state.sorteoTipo);
  if (state.sorteoEstado !== 'todos') params.set('estado', state.sorteoEstado);
  if (state.sort !== 'destacados') params.set('orden', state.sort);
  if (state.search) params.set('q', state.search);
  if (state.currentPage > 1) params.set('page', String(state.currentPage));

  const nextQuery = params.toString();
  const nextUrl = nextQuery
    ? `${window.location.pathname}?${nextQuery}`
    : window.location.pathname;

  window.history.replaceState(null, '', nextUrl);
}

function optimizarImagenUrl(url, { width = 720, quality = 72 } = {}) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw, window.location.origin);
    const publicPath = '/storage/v1/object/public/';

    if (!parsed.pathname.includes(publicPath)) {
      return parsed.toString();
    }

    parsed.pathname = parsed.pathname.replace(
      publicPath,
      '/storage/v1/render/image/public/'
    );
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', String(quality));
    parsed.searchParams.set('resize', 'cover');

    return parsed.toString();
  } catch {
    return raw;
  }
}

function normalizarTipoProducto(value) {
  return value === 'combo' || value === 'juegos' ? value : SORTEO_TIPO_DEFAULT;
}

function getTipoProductoLabel(value) {
  const tipoProducto = normalizarTipoProducto(value);
  if (tipoProducto === 'combo') return 'Combo';
  if (tipoProducto === 'juegos') return 'Juegos';
  return 'Pantalla';
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString('es-CO');
}

function getSorteoMetrics(sorteo) {
  const vendidos = Math.max(
    0,
    Number(sorteo.ocupados ?? sorteo.numeros_vendidos ?? 0) || 0
  );
  const total = Math.max(
    0,
    Number(sorteo.cantidad_numeros ?? sorteo.total_numeros ?? 0) || 0
  );
  const disponibles = Math.max(total - vendidos, 0);
  const porcentaje = total > 0 ? Math.min(100, Math.round((vendidos / total) * 100)) : 0;

  let statusKey = 'comprables';
  let statusLabel = 'En venta';
  let statusClass = 'status-open';

  if (String(sorteo.estado || '').toLowerCase() === 'lleno' || porcentaje >= 100) {
    statusKey = 'vivo';
    statusLabel = 'Listo para resultado en vivo';
    statusClass = 'status-closed';
  } else if (porcentaje >= 80) {
    statusKey = 'casi_lleno';
    statusLabel = 'Casi lleno';
    statusClass = 'status-pending';
  }

  return {
    vendidos,
    total,
    disponibles,
    porcentaje,
    statusKey,
    statusLabel,
    statusClass,
  };
}

function buildSorteoItem(sorteo, index) {
  const tipoProducto = normalizarTipoProducto(sorteo.tipo_producto);
  const tipoLabel = getTipoProductoLabel(tipoProducto);
  const metrics = getSorteoMetrics(sorteo);
  const precioRaw = Number(sorteo.precio_numero ?? sorteo.precio ?? 0) || 0;
  const precioText = formatCurrency(precioRaw);

  const searchIndex = normalizeSearchText([
    sorteo.descripcion,
    sorteo.premio,
    tipoLabel,
    metrics.statusLabel,
    precioText,
    `ronda ${sorteo.id}`,
    `sorteo ${sorteo.id}`,
  ].join(' '));

  return {
    sorteo,
    index,
    tipoProducto,
    tipoLabel,
    metrics,
    precioRaw,
    precioText,
    searchIndex,
  };
}

function renderSorteoImage(sorteo, index) {
  if (!sorteo.imagen_url) {
    return '<span class="placeholder">Imagen</span>';
  }

  const originalUrl = String(sorteo.imagen_url).trim();
  const prioridadAlta = index < 2;
  const optimizedUrl = optimizarImagenUrl(originalUrl, {
    width: prioridadAlta ? 960 : 720,
    quality: prioridadAlta ? 78 : 70,
  });

  return `
    <span class="sorteo-image-skeleton" aria-hidden="true"></span>
    <img
      src="${optimizedUrl}"
      data-sorteo-img
      data-fallback-src="${originalUrl}"
      alt="${sorteo.descripcion}"
      class="sorteo-image-media"
      loading="${prioridadAlta ? 'eager' : 'lazy'}"
      decoding="async"
      fetchpriority="${prioridadAlta ? 'high' : 'low'}"
      width="1200"
      height="576"
    >
  `;
}

function hydrateSorteoImages(root) {
  root.querySelectorAll('[data-sorteo-img]').forEach((img) => {
    const wrapper = img.closest('.sorteo-image');
    if (!wrapper) return;

    const markLoaded = () => wrapper.classList.add('is-loaded');

    const handleError = () => {
      const fallbackSrc = img.dataset.fallbackSrc;
      const alreadyRetried = img.dataset.retryFallback === 'true';

      if (!alreadyRetried && fallbackSrc && img.currentSrc !== fallbackSrc) {
        img.dataset.retryFallback = 'true';
        img.src = fallbackSrc;
        return;
      }

      wrapper.classList.add('is-error', 'is-loaded');
    };

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
      return;
    }

    if (img.complete && img.naturalWidth === 0) {
      handleError();
      return;
    }

    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', handleError);
  });
}

function setBienvenida(user) {
  const titulo = document.getElementById('tituloBienvenida');
  const subtitulo = document.getElementById('subtituloBienvenida');
  if (!user) return;

  const nombre = user.nombre || user.alias || user.email || '';
  if (titulo) titulo.textContent = nombre ? `Hola ${nombre} 👋` : 'Hola 👋';
  if (subtitulo) {
    subtitulo.textContent =
      'Adquiere tus numeros, sube tu comprobante y espera la dinamica.';
  }
}

function renderSorteoCard(item, index = 0) {
  const { sorteo, tipoProducto, tipoLabel, metrics, precioText } = item;
  const imagen = renderSorteoImage(sorteo, index);

  return `
    <article class="sorteo-card">
      <div class="sorteo-image">${imagen}</div>

      <div class="sorteo-content">
        <div class="sorteo-header-row">
          <h3 class="sorteo-title">${sorteo.descripcion}</h3>
          <div class="sorteo-badges-row">
            <span class="sorteo-type-badge sorteo-type-badge--${tipoProducto}">${tipoLabel}</span>
            <span class="status-badge ${metrics.statusClass}">${metrics.statusLabel}</span>
          </div>
        </div>

        <div class="sorteo-info">Premio: ${sorteo.premio}</div>
        <div class="sorteo-info">Precio: $${precioText}</div>
        <div class="sorteo-info">Vendidos: ${metrics.vendidos} / ${metrics.total}</div>
        <div class="sorteo-info">Disponibles: ${metrics.disponibles}</div>

        <div class="progress-container">
          <div class="progress-bar" style="width:${metrics.porcentaje}%"></div>
        </div>

        <div class="cta">
          ${
            metrics.statusKey === 'vivo'
              ? `
                <a class="btn btn-secondary sorteo-enter-btn sorteo-enter-btn--live" href="ruleta-live.html?id=${sorteo.id}">
                  <span class="sorteo-enter-btn__copy">
                    <span class="sorteo-enter-btn__title">Entrar al vivo</span>
                    <span class="sorteo-enter-btn__meta">Mira la ruleta y sigue el resultado en tiempo real</span>
                  </span>
                  <span class="sorteo-enter-btn__arrow" aria-hidden="true">>></span>
                </a>
              `
              : `
                <a class="btn btn-primary sorteo-enter-btn" href="sorteo.html?id=${sorteo.id}">
                  <span class="sorteo-enter-btn__copy">
                    <span class="sorteo-enter-btn__title">Entrar al sorteo</span>
                    <span class="sorteo-enter-btn__meta">Elige tus numeros y confirma tu pago sin salirte del flujo</span>
                  </span>
                  <span class="sorteo-enter-btn__arrow" aria-hidden="true">-></span>
                </a>
              `
          }
        </div>
      </div>
    </article>
  `;
}

function renderLoadingCards() {
  if (!dom.sorteoGrid) return;

  dom.sorteoGrid.classList.add('is-loading');
  dom.sorteoGrid.innerHTML = Array.from({ length: currentItemsPerPage }, (_, index) => `
    <article class="dashboard-skeleton-card" aria-hidden="true">
      <div class="dashboard-skeleton-card__media"></div>
      <div class="dashboard-skeleton-card__body">
        <span class="dashboard-skeleton-card__line dashboard-skeleton-card__line--title"></span>
        <span class="dashboard-skeleton-card__line"></span>
        <span class="dashboard-skeleton-card__line dashboard-skeleton-card__line--short"></span>
        <span class="dashboard-skeleton-card__progress"></span>
        <span class="dashboard-skeleton-card__button"></span>
      </div>
    </article>
  `).join('');

  if (dom.emptyState) dom.emptyState.hidden = true;
  if (dom.pagination) dom.pagination.hidden = true;
  if (dom.resultadosInfo) dom.resultadosInfo.textContent = 'Cargando rondas...';
  if (dom.paginaInfo) dom.paginaInfo.textContent = 'Preparando catalogo';
}

function updateSorteosStats() {
  const el = dom.statSorteosActivos;
  const note = dom.statSorteosNota;
  const count = state.sorteos.length;

  if (el) {
    el.textContent = String(count);
    el.style.opacity = '1';
  }

  if (!note) return;

  if (count <= 0) {
    note.textContent = 'Cuando abramos una nueva ronda, la veras aqui sin tener que buscarla entre ruido.';
  } else if (count === 1) {
    note.textContent = 'Tienes 1 ronda lista para revisar con un flujo mas ordenado y directo.';
  } else {
    note.textContent = `Tienes ${count} rondas activas. Usa filtros y paginas para encontrar la indicada mas rapido.`;
  }
}

function updateTipoSorteoUI() {
  document.querySelectorAll('[data-tipo-sorteo]').forEach((chip) => {
    chip.classList.toggle(
      'chip-filtro--activo',
      chip.dataset.tipoSorteo === state.sorteoTipo
    );
  });
}

function updateEstadoSorteoUI() {
  document.querySelectorAll('[data-estado-sorteo]').forEach((chip) => {
    chip.classList.toggle(
      'chip-filtro--activo',
      chip.dataset.estadoSorteo === state.sorteoEstado
    );
  });
}

function syncControlsWithState() {
  if (dom.searchInput && dom.searchInput.value !== state.search) {
    dom.searchInput.value = state.search;
  }

  if (dom.sortSelect) {
    dom.sortSelect.value = state.sort;
  }

  updateTipoSorteoUI();
  updateEstadoSorteoUI();
}

function matchesSearch(item) {
  const query = normalizeSearchText(state.search);
  if (!query) return true;
  return item.searchIndex.includes(query);
}

function matchesTipo(item) {
  return state.sorteoTipo === 'todos' || item.tipoProducto === state.sorteoTipo;
}

function matchesEstado(item) {
  return state.sorteoEstado === 'todos' || item.metrics.statusKey === state.sorteoEstado;
}

function getDestacadoPriority(item) {
  if (item.metrics.statusKey === 'vivo') return 3;
  if (item.metrics.statusKey === 'casi_lleno') return 2;
  return 1;
}

function sortPreparedSorteos(items) {
  const sorted = [...items];

  if (state.sort === 'avance') {
    sorted.sort((a, b) => {
      return (b.metrics.porcentaje - a.metrics.porcentaje) || (a.index - b.index);
    });
    return sorted;
  }

  if (state.sort === 'precio_bajo') {
    sorted.sort((a, b) => {
      return (a.precioRaw - b.precioRaw) || (a.index - b.index);
    });
    return sorted;
  }

  if (state.sort === 'ultimos_cupos') {
    sorted.sort((a, b) => {
      return (a.metrics.disponibles - b.metrics.disponibles)
        || (b.metrics.porcentaje - a.metrics.porcentaje)
        || (a.index - b.index);
    });
    return sorted;
  }

  sorted.sort((a, b) => {
    return (getDestacadoPriority(b) - getDestacadoPriority(a))
      || (b.metrics.porcentaje - a.metrics.porcentaje)
      || (a.metrics.disponibles - b.metrics.disponibles)
      || (a.precioRaw - b.precioRaw)
      || (a.index - b.index);
  });
  return sorted;
}

function getPreparedVisibleSorteos() {
  const prepared = state.sorteos.map((sorteo, index) => buildSorteoItem(sorteo, index));

  const filtered = prepared.filter((item) => {
    return matchesTipo(item) && matchesEstado(item) && matchesSearch(item);
  });

  return sortPreparedSorteos(filtered);
}

function getEmptyStateCopy() {
  if (!state.sorteos.length) {
    return {
      title: 'No hay rondas activas por ahora',
      text: 'Cuando abramos nuevas rondas, apareceran aqui listas para filtrar y explorar.',
      showReset: false,
    };
  }

  if (state.search) {
    return {
      title: 'No encontramos coincidencias',
      text: 'Prueba con otra palabra o limpia los filtros para volver a ver todas las rondas.',
      showReset: true,
    };
  }

  return {
    title: 'Ninguna ronda coincide con esos filtros',
    text: 'Cambia el tipo, el estado o el orden para encontrar otras opciones activas.',
    showReset: true,
  };
}

function updateEmptyState(show, copy = getEmptyStateCopy()) {
  if (!dom.emptyState) return;

  dom.emptyState.hidden = !show;

  if (!show) return;

  if (dom.emptyTitle) dom.emptyTitle.textContent = copy.title;
  if (dom.emptyText) dom.emptyText.textContent = copy.text;
  if (dom.resetFilters) dom.resetFilters.hidden = !copy.showReset;
}

function updateResultsMeta({ total, startIndex, endIndex, totalPages }) {
  if (dom.resultadosInfo) {
    if (!total) {
      dom.resultadosInfo.textContent = '0 rondas';
    } else {
      dom.resultadosInfo.textContent = `Mostrando ${startIndex}-${endIndex} de ${total} rondas`;
    }
  }

  if (dom.paginaInfo) {
    dom.paginaInfo.textContent = `Pagina ${state.currentPage} de ${totalPages}`;
  }
}

function buildPaginationItems(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = 4;
  }

  if (currentPage >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  if (start > 2) items.push('ellipsis-start');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push('ellipsis-end');
  items.push(totalPages);

  return items;
}

function renderPagination(totalPages) {
  if (!dom.pagination || !dom.prevPage || !dom.nextPage || !dom.pageNumbers) return;

  if (totalPages <= 1) {
    dom.pagination.hidden = true;
    dom.pageNumbers.innerHTML = '';
    return;
  }

  dom.pagination.hidden = false;
  dom.prevPage.disabled = state.currentPage <= 1;
  dom.nextPage.disabled = state.currentPage >= totalPages;

  const items = buildPaginationItems(totalPages, state.currentPage);
  dom.pageNumbers.innerHTML = items.map((item) => {
    if (typeof item !== 'number') {
      return '<span class="sorteos-pagination__ellipsis" aria-hidden="true">...</span>';
    }

    const active = item === state.currentPage;
    return `
      <button
        type="button"
        class="sorteo-page-btn ${active ? 'is-active' : ''}"
        data-page="${item}"
        aria-current="${active ? 'page' : 'false'}"
      >
        ${item}
      </button>
    `;
  }).join('');
}

function setPage(nextPage) {
  state.currentPage = sanitizePage(nextPage);
  renderSorteosView();
}

function resetDashboardFilters() {
  state.sorteoTipo = 'todos';
  state.sorteoEstado = 'todos';
  state.search = '';
  state.sort = 'destacados';
  state.currentPage = 1;
  syncControlsWithState();
  renderSorteosView();
}

function renderSorteosView() {
  if (!dom.sorteoGrid) return;

  currentItemsPerPage = getItemsPerPage();
  const visibleItems = getPreparedVisibleSorteos();
  const totalItems = visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentItemsPerPage));

  state.currentPage = Math.min(state.currentPage, totalPages);
  state.currentPage = Math.max(state.currentPage, 1);

  const start = (state.currentPage - 1) * currentItemsPerPage;
  const pageItems = visibleItems.slice(start, start + currentItemsPerPage);
  const startIndex = totalItems ? start + 1 : 0;
  const endIndex = totalItems ? start + pageItems.length : 0;

  syncControlsWithState();
  syncDashboardStateToUrl();
  updateResultsMeta({ total: totalItems, startIndex, endIndex, totalPages });

  if (!pageItems.length) {
    dom.sorteoGrid.classList.remove('is-loading');
    dom.sorteoGrid.innerHTML = '';
    updateEmptyState(true, getEmptyStateCopy());
    renderPagination(0);
    return;
  }

  updateEmptyState(false);
  dom.sorteoGrid.classList.remove('is-loading');
  dom.sorteoGrid.innerHTML = pageItems
    .map((item, index) => renderSorteoCard(item, index))
    .join('');
  hydrateSorteoImages(dom.sorteoGrid);
  renderPagination(totalPages);
}

function handleResize() {
  const nextItemsPerPage = getItemsPerPage();
  if (nextItemsPerPage === currentItemsPerPage) return;
  currentItemsPerPage = nextItemsPerPage;
  renderSorteosView();
}

function initDashboardControls() {
  dom.tipoFiltros?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tipo-sorteo]');
    if (!button) return;

    state.sorteoTipo = sanitizeFilter(
      button.dataset.tipoSorteo || 'todos',
      VALID_TIPOS,
      'todos'
    );
    state.currentPage = 1;
    renderSorteosView();
  });

  dom.estadoFiltros?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-estado-sorteo]');
    if (!button) return;

    state.sorteoEstado = sanitizeFilter(
      button.dataset.estadoSorteo || 'todos',
      VALID_ESTADOS,
      'todos'
    );
    state.currentPage = 1;
    renderSorteosView();
  });

  dom.searchInput?.addEventListener('input', () => {
    state.search = dom.searchInput.value.trim();
    state.currentPage = 1;
    renderSorteosView();
  });

  dom.sortSelect?.addEventListener('change', () => {
    state.sort = sanitizeFilter(
      dom.sortSelect.value || 'destacados',
      VALID_ORDENES,
      'destacados'
    );
    state.currentPage = 1;
    renderSorteosView();
  });

  dom.resetFilters?.addEventListener('click', () => {
    resetDashboardFilters();
  });

  dom.prevPage?.addEventListener('click', () => {
    if (state.currentPage <= 1) return;
    setPage(state.currentPage - 1);
  });

  dom.nextPage?.addEventListener('click', () => {
    setPage(state.currentPage + 1);
  });

  dom.pageNumbers?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    setPage(button.dataset.page);
  });

  window.addEventListener('resize', handleResize);
}

function showLoadError() {
  if (dom.sorteoGrid) {
    dom.sorteoGrid.classList.remove('is-loading');
    dom.sorteoGrid.innerHTML = '';
  }

  if (dom.pagination) dom.pagination.hidden = true;
  if (dom.resultadosInfo) dom.resultadosInfo.textContent = 'Sin datos';
  if (dom.paginaInfo) dom.paginaInfo.textContent = 'Pagina 1 de 1';

  updateEmptyState(true, {
    title: 'No se pudieron cargar las rondas',
    text: 'Revisa tu conexion o actualiza la pagina para intentarlo de nuevo.',
    showReset: false,
  });

  if (dom.statSorteosActivos) {
    dom.statSorteosActivos.textContent = '0';
    dom.statSorteosActivos.style.opacity = '0.5';
  }

  if (dom.statSorteosNota) {
    dom.statSorteosNota.textContent =
      'Cuando la conexion vuelva, el tablero mostrara las rondas activas con filtros y paginas.';
  }
}

async function cargarSorteosActivos() {
  renderLoadingCards();

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    state.sorteos = Array.isArray(data)
      ? data.filter((sorteo) => String(sorteo.estado || '').toLowerCase() !== 'finalizado')
      : [];

    updateSorteosStats();
    renderSorteosView();
  } catch (err) {
    console.error('Error cargando rondas del dashboard:', err);
    state.sorteos = [];
    showLoadError();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../index.html' })
    : null;

  if (!user) return;

  readInitialDashboardState();
  syncControlsWithState();
  setBienvenida(user);
  initDashboardControls();

  const pendingTasks = [
    cargarMisNumerosResumen(),
    cargarSorteosActivos(),
  ];

  cargarProgresoBono();
  await Promise.allSettled(pendingTasks);
});
