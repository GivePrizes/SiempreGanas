// assets/js/admin/index.js
import { cargarComprobantes } from './comprobantes.js';
import { cargarStats } from './stats.js';
import { cargarGraficos } from './graficos.js';
import { cargarSorteosAdmin } from './sorteos-admin.js';

// Al cargar el panel admin, verificamos que haya token y que sea admin
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') {
    alert('No tienes acceso al panel de administrador.');
    location.href = '../index.html';
    return;
  }

  // Inicializar módulos
  cargarComprobantes();
  setInterval(cargarComprobantes, 10000); // refresco suave

  cargarStats();
  setInterval(cargarStats, 15000);

  cargarGraficos();

  cargarSorteosAdmin();
  setInterval(cargarSorteosAdmin, 20000);
});
