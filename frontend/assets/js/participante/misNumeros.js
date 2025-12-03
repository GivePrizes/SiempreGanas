// assets/js/participante/misNumeros.js

// Resumen para dashboard
export async function cargarMisNumerosResumen() {
  const token = localStorage.getItem('token');
  const stat = document.getElementById('statMisNumeros');
  if (!token || !stat) return;

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      stat.textContent = '—';
      return;
    }

    // cantidad total de números
    const totalNumeros = data.reduce((acc, p) => acc + (p.numeros?.length || 0), 0);
    stat.textContent = totalNumeros.toString();
  } catch (err) {
    console.error(err);
    const stat = document.getElementById('statMisNumeros');
    if (stat) stat.textContent = '—';
  }
}

// Vista completa en mis-numeros.html
export async function cargarMisNumerosDetalle() {
  const token = localStorage.getItem('token');
  const cont = document.getElementById('misNumerosLista');
  if (!token || !cont) return;

  cont.innerHTML = '<p>Cargando tus participaciones...</p>';

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !Array.isArray(data) || data.length === 0) {
      cont.innerHTML = `
        <p>No tienes números aún.</p>
        <p>Ve al panel de sorteos y elige tus primeros números 🎟</p>
      `;
      return;
    }

    cont.innerHTML = data
      .map(p => {
        const numeros = p.numeros?.join(', ') || '';
        const fecha = p.fecha
          ? new Date(p.fecha).toLocaleString()
          : '';
        const estado = p.estado || 'pendiente';

        let estadoLabel = '';
        if (estado === 'aprobado') {
          estadoLabel = '<span class="badge badge-activo">Aprobado</span>';
        } else if (estado === 'rechazado') {
          estadoLabel = '<span class="badge badge-finalizado">Rechazado</span>';
        } else {
          estadoLabel = '<span class="badge badge-lleno">Pendiente</span>';
        }

        return `
          <article class="sorteo-card">
            <h3>${p.sorteo}</h3>
            <p class="sorteo-detalle">Números: <strong>${numeros}</strong></p>
            <p class="sorteo-detalle">Estado: ${estadoLabel}</p>
            <p class="sorteo-detalle-mini">Fecha de compra: ${fecha}</p>
          </article>
        `;
      })
      .join('');
  } catch (err) {
    console.error(err);
    cont.innerHTML = '<p>Error al cargar tus números. Intenta más tarde.</p>';
  }
}
