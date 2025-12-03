// assets/js/admin/stats.js

export async function cargarStats() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Solo admin
  if (!token || user.rol !== 'admin') return;

  const statUsuarios = document.getElementById('statUsuarios');
  const statSorteos = document.getElementById('statSorteos');
  const statPendientes = document.getElementById('statPendientes');

  try {
    // 1) Sorteos (app-service)
    const resSorteos = await fetch(`${API_URL}/api/sorteos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const sorteos = await resSorteos.json();

    if (statSorteos) {
      if (Array.isArray(sorteos)) {
        statSorteos.textContent = sorteos.length.toString();
      } else {
        statSorteos.textContent = '—';
      }
    }

    // 2) Comprobantes pendientes (app-service)
    const resComp = await fetch(`${API_URL}/api/admin/comprobantes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const comprobantes = await resComp.json();

    if (statPendientes) {
      if (Array.isArray(comprobantes)) {
        statPendientes.textContent = comprobantes.length.toString();
      } else {
        statPendientes.textContent = '—';
      }
    }

    // 3) Usuarios (auth-service)
    // De momento no tenemos un endpoint de "total usuarios",
    // así que lo dejamos en "—" para no inventar datos.
    if (statUsuarios) {
      statUsuarios.textContent = '—';
    }
  } catch (err) {
    console.error('Error cargando stats admin:', err);
    if (statSorteos) statSorteos.textContent = '—';
    if (statPendientes) statPendientes.textContent = '—';
    if (statUsuarios) statUsuarios.textContent = '—';
  }
}
