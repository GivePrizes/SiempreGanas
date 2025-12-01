async function cargarGraficos() {
  // Sorteos ocupación
  const resSorteos = await fetch(`${API_URL}/sorteos`);
  const sorteos = await resSorteos.json();
  const labels = sorteos.map(s => s.descripcion);
  const ocupados = sorteos.map(s => s.ocupados);
  const libres = sorteos.map(s => s.cantidad_numeros - s.ocupados);

  new Chart(document.getElementById('chartSorteos'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ocupados', data: ocupados, backgroundColor: '#E50914' },
        { label: 'Libres', data: libres, backgroundColor: '#FFD700' }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Comprobantes estado
  const resComp = await fetch(`${API_URL}/admin/comprobantes`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const comp = await resComp.json();
  const pendientes = comp.filter(c => c.estado === 'pendiente').length;
  const aprobados = comp.filter(c => c.estado === 'aprobado').length;
  const rechazados = comp.filter(c => c.estado === 'rechazado').length;

  new Chart(document.getElementById('chartComprobantes'), {
    type: 'pie',
    data: {
      labels: ['Pendientes', 'Aprobados', 'Rechazados'],
      datasets: [{
        data: [pendientes, aprobados, rechazados],
        backgroundColor: ['#FFD700', '#00ff88', '#E50914']
      }]
    },
    options: { responsive: true }
  });
}
