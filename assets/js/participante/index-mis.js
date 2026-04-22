// assets/js/participante/index-mis.js
import { cargarMisNumerosDetalle } from './misNumeros.js?v=20260422b';

const chips = document.querySelectorAll('.chip-filtro');
const MIS_NUMEROS_REFRESH_MS = 20000;

let misNumerosRefreshTimer = null;

function getEstadoFromQuery() {
  const estado = new URLSearchParams(window.location.search).get('estado') || 'todos';
  const permitidos = new Set(['todos', 'activo', 'pendiente', 'finalizado']);
  return permitidos.has(estado) ? estado : 'todos';
}

function getEstadoActivoUI() {
  return (
    document.querySelector('.chip-filtro.chip-filtro--activo')?.getAttribute('data-estado') ||
    'todos'
  );
}

function activarChipPorEstado(estado) {
  chips.forEach((c) => c.classList.remove('chip-filtro--activo'));
  const target = Array.from(chips).find((c) => c.getAttribute('data-estado') === estado);
  if (target) target.classList.add('chip-filtro--activo');
}

function setupFiltros() {
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const estado = chip.getAttribute('data-estado') || 'todos';

      chips.forEach((c) => c.classList.remove('chip-filtro--activo'));
      chip.classList.add('chip-filtro--activo');

      // Filtra sin recargar (usa window.filtrarMisNumeros del misNumeros.js)
      window.filtrarMisNumeros?.(estado);
    });
  });
}

function refreshMisNumerosSilently() {
  return cargarMisNumerosDetalle({ silent: true }).then(() => {
    window.filtrarMisNumeros?.(getEstadoActivoUI());
  });
}

function startMisNumerosAutoRefresh() {
  if (misNumerosRefreshTimer) {
    clearInterval(misNumerosRefreshTimer);
  }

  misNumerosRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    refreshMisNumerosSilently().catch(() => {});
  }, MIS_NUMEROS_REFRESH_MS);

  window.addEventListener('focus', () => {
    refreshMisNumerosSilently().catch(() => {});
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshMisNumerosSilently().catch(() => {});
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../login.html' })
    : null;
  const token = localStorage.getItem('token');

  if (!token || !user?.id) {
    return;
  }

  setupFiltros();

  const estadoInicial = getEstadoFromQuery();
  activarChipPorEstado(estadoInicial);

  await cargarMisNumerosDetalle();
  window.filtrarMisNumeros?.(estadoInicial);

  startMisNumerosAutoRefresh();
});
