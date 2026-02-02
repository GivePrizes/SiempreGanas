// assets/js/admin/index.js
import { cargarComprobantes } from './comprobantes.js';
import { cargarStats } from './stats.js';
import { cargarGraficos } from './graficos.js';
import { cargarSorteosAdmin } from './sorteos-admin.js';
import { hasPerm } from './permisos.js';

// Al cargar el panel admin, verificamos que haya token y que sea admin
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') {
    alert('No tienes acceso al panel de administrador.');
    location.href = '../index.html';
    return;
  }

  // ✅ Permisos
  const puedePagos = hasPerm('pagos:aprobar');
  const puedeCuentas = hasPerm('cuentas:gestionar');

  // ✅ Si es admin SOLO de cuentas, lo mandamos a su panel dedicado
  if (puedeCuentas && !puedePagos) {
    location.href = 'cuentas-sorteo.html';
    return;
  }

  // ✅ Si NO tiene pagos: ocultamos bloques y NO llamamos endpoints de pagos (evita 403 spam)
  if (!puedePagos) {
    const bloqueComprobantes = document.getElementById('bloqueComprobantes');
    if (bloqueComprobantes) bloqueComprobantes.style.display = 'none';

    const bloqueStats = document.getElementById('bloqueStats');
    if (bloqueStats) bloqueStats.style.display = 'none';

    const bloqueGraficos = document.getElementById('bloqueGraficos');
    if (bloqueGraficos) bloqueGraficos.style.display = 'none';
  } else {
    // ✅ Admin pagos: carga normal
    cargarComprobantes();
    setInterval(cargarComprobantes, 10000);

    cargarStats();
    setInterval(cargarStats, 15000);

    cargarGraficos();
  }

  // ✅ Sorteos (solo lectura) para admins que vean este panel
  cargarSorteosAdmin();
  setInterval(cargarSorteosAdmin, 20000);
});
