// assets/js/admin/index.js
import { cargarComprobantes } from './comprobantes.js?v=20260414d';
import { cargarStats } from './stats.js';
import { cargarSorteosAdmin } from './sorteos-admin.js?v=20260415a';

// Al cargar el panel admin, verificamos que haya token y que sea admin
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../index.html' })
    : null;

  if (!token || !user || user.rol !== 'admin') {
    alert('No tienes acceso al panel de administrador.');
    location.href = '../index.html';
    return;
  }

  // ✅ Permisos
  const permisos = Array.isArray(user.permisos) ? user.permisos : [];
  const puedePagos = permisos.includes('pagos:aprobar');
  const puedeCuentas = permisos.includes('cuentas:gestionar');

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

  } else {
    // ✅ Admin pagos: carga normal
    cargarComprobantes();
    setInterval(cargarComprobantes, 300000); // 5 min

    cargarStats();
    setInterval(cargarStats, 300000); // 5 min

  }

  // ✅ Sorteos (solo lectura) para admins que vean este panel
  cargarSorteosAdmin();
  setInterval(cargarSorteosAdmin, 300000); // 5 min (silencioso con fade)
});
