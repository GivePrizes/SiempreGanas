// assets/js/participante/index-mis.js
import { cargarMisNumerosDetalle } from './misNumeros.js?v=20260414e';

const chips = document.querySelectorAll('.chip-filtro');

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

document.addEventListener('DOMContentLoaded', async () => {
  setupFiltros();

  const estadoInicial = getEstadoFromQuery();
  activarChipPorEstado(estadoInicial);

  await cargarMisNumerosDetalle();
  window.filtrarMisNumeros?.(estadoInicial);

  // Actualizacion suave y silenciosa
  setInterval(() => {
    cargarMisNumerosDetalle({ silent: true }).then(() => {
      window.filtrarMisNumeros?.(getEstadoActivoUI());
    });
  }, 20000);
});
