// assets/js/admin/graficos.js

// Guardamos las instancias para no crear gráficos duplicados
let chartSorteosInstance = null;
let chartComprobantesInstance = null;

export async function cargarGraficos() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Solo tiene sentido cargar gráficos si es admin y hay Chart
  if (!token || user.rol !== 'admin') return;
  if (typeof Chart === 'undefined') {
    return;
  }

  const canvasSorteos = document.getElementById('chartSorteos');
  const canvasComprobantes = document.getElementById('chartComprobantes');

  if (!canvasSorteos || !canvasComprobantes) {
    // Estamos en otra página sin gráficos
    return;
  }

  try {
    // 1) Datos de sorteos
    const resSorteos = await fetch(`${API_URL}/api/sorteos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const sorteos = await resSorteos.json();

    // 2) Datos de comprobantes (solo pendientes, pero los usamos como conteo)
    const resComp = await fetch(`${API_URL}/api/admin/comprobantes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const comprobantes = await resComp.json();

    // --- Preparar datos de sorteos ---
    const labelsSorteos = Array.isArray(sorteos)
      ? sorteos.map(s => s.descripcion)
      : [];
    const datosOcupados = Array.isArray(sorteos)
      ? sorteos.map(s => s.ocupados || 0)
      : [];

    // --- Preparar datos de comprobantes ---
    const pendientes = Array.isArray(comprobantes) ? comprobantes.length : 0;
    // Por ahora solo tenemos pendientes en el endpoint; dejamos aprobados/rechazados en 0
    const aprobados = 0;
    const rechazados = 0;

    // Destruir gráficos antiguos si existen
    if (chartSorteosInstance) {
      chartSorteosInstance.destroy();
    }
    if (chartComprobantesInstance) {
      chartComprobantesInstance.destroy();
    }

    // --- Gráfico de sorteos (barras) ---
    chartSorteosInstance = new Chart(canvasSorteos.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labelsSorteos,
        datasets: [
          {
            label: 'Números vendidos',
            data: datosOcupados
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Ocupación por sorteo'
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 10 } }
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // --- Gráfico de comprobantes (pastel/dona) ---
    chartComprobantesInstance = new Chart(canvasComprobantes.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Pendientes', 'Aprobados', 'Rechazados'],
        datasets: [
          {
            data: [pendientes, aprobados, rechazados]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Estado de comprobantes'
          }
        }
      }
    });
  } catch (err) {
    console.error('Error cargando gráficos del admin:', err);
  }
}

