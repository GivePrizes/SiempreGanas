// assets/js/participante/index-mis.js
import { cargarMisNumerosDetalle } from './misNumeros.js';

const chips = document.querySelectorAll('.chip-filtro');

function setupFiltros() {
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const estado = chip.getAttribute('data-estado') || 'todos';

      chips.forEach((c) => c.classList.remove('chip-filtro--activo'));
      chip.classList.add('chip-filtro--activo');

      // Filtra sin recargar (usa el window.filtrarMisNumeros del misNumeros.js)
      window.filtrarMisNumeros?.(estado);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupFiltros();
  cargarMisNumerosDetalle(); // carga y render inicial (Todos)

  // Actualización suave y silenciosa
  setInterval(() => {
    cargarMisNumerosDetalle({ silent: true });
  }, 20000);
});
