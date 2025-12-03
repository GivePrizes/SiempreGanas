async function cargarGraficos() {
  // Sorteos ocupación
  const resSorteos = await fetch(`${API_URL}/api/sorteos`);
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
  const resComp = await fetch(`${API_URL}/api/admin/comprobantes`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const comp = await resComp.json();
  const pendientes = comp.length;
  const aprobados = 0;
  const rechazados = 0;


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
