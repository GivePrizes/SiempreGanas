
async function cargarStats() {
  try {
    // Usuarios registrados (auth-service)
    const resUsuarios = await fetch(`${AUTH_URL}/api/auth/validate`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const usuarios = resUsuarios.ok ? await resUsuarios.json() : { total: 0 };
    document.getElementById('statUsuarios').textContent = '—';


    // Sorteos activos (app-service)
    const resSorteos = await fetch(`${API_URL}/api/sorteos`);
    const sorteos = await resSorteos.json();
    document.getElementById('statSorteos').textContent = sorteos.length;

    // Comprobantes pendientes (app-service)
    const resComp = await fetch(`${API_URL}/api/admin/comprobantes`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const comp = await resComp.json();
    document.getElementById('statPendientes').textContent = comp.length;
  } catch (err) {
    console.error(err);
  }
}