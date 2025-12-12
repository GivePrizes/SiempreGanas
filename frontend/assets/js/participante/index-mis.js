// assets/js/participante/index-mis.js
import { cargarMisNumerosDetalle } from './misNumeros.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) Carga inicial
  cargarMisNumerosDetalle();

  // 2) Filtros (chips)
  const chips = document.querySelectorAll('.chip-filtro');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const estado = chip.getAttribute('data-estado') || 'todos';

      chips.forEach((c) => c.classList.remove('chip-filtro--activo'));
      chip.classList.add('chip-filtro--activo');

      // ✅ Filtra interno (sin recargar)
      window.filtrarMisNumeros?.(estado);
    });
  });
});
