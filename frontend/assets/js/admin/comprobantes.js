// frontend/assets/js/admin/comprobantes.js

const API_URL = window.API_URL || '';

function agruparComprobantesPorSorteo(comprobantes) {
  const mapa = new Map();

  for (const c of comprobantes) {
    const id = c.sorteo_id; // viene del backend
    if (!mapa.has(id)) {
      mapa.set(id, {
        sorteo_id: id,
        sorteo: c.sorteo, // nombre/descripcion del sorteo
        comprobantes: [],
      });
    }
    mapa.get(id).comprobantes.push(c);
  }

  return Array.from(mapa.values());
}

// 👇 EXPORTAMOS la función para que index.js la pueda importar
export async function cargarComprobantes() {
  const contenedor = document.getElementById('comprobantes');
  if (contenedor) {
    contenedor.innerHTML = '<p class="loading">Cargando comprobantes...</p>';
  }

  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/admin/comprobantes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    if (contenedor) {
      contenedor.innerHTML =
        '<p>No tienes permisos o tu sesión expiró. Vuelve a iniciar sesión.</p>';
    }
    console.warn('No autorizado en /api/admin/comprobantes');
    return;
  }

  if (!res.ok) {
    console.error('Error al cargar comprobantes:', res.status);
    if (contenedor) {
      contenedor.innerHTML = '<p>Error al cargar comprobantes.</p>';
    }
    return;
  }

  const data = await res.json();

  const grupos = agruparComprobantesPorSorteo(data);

  if (!grupos.length) {
    contenedor.innerHTML = '<p>¡No hay pendientes! 🎉</p>';
    return;
  }

  contenedor.innerHTML = grupos
    .map((grupo) => {
      const items = grupo.comprobantes
        .map(
          (c) => `
          <li class="comprobante-item">
            <div class="comprobante-info">
              <strong>#${c.numero}</strong> — ${c.usuario} (${c.telefono})
              <br>
              <a href="${c.comprobante_url}" target="_blank" class="link">
                Ver comprobante
              </a>
              <br>
              <small>${new Date(c.fecha).toLocaleString()}</small>
            </div>
            <div class="comprobante-actions">
              <button class="btn-green" onclick="aprobar(${c.id})">✅ Aprobar</button>
              <button class="btn-red" onclick="rechazar(${c.id})">❌ Rechazar</button>
            </div>
          </li>
        `
        )
        .join('');

      return `
        <article class="sg-card comprobante-group">
          <header class="comprobante-group-header">
            <h3>${grupo.sorteo}</h3>
            <span class="badge">${grupo.comprobantes.length} pendiente(s)</span>
          </header>
          <ul class="comprobante-list">
            ${items}
          </ul>
        </article>
      `;
    })
    .join('');
}

// Estas dos funciones se usan desde el HTML generado con onclick="..."
// En módulos NO se vuelven globales, así que las colgamos de window:
async function aprobar(id) {
  if (!confirm('¿Aprobar?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/admin/comprobantes/aprobar/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  cargarComprobantes();
}

async function rechazar(id) {
  if (!confirm('¿Rechazar?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/admin/comprobantes/rechazar/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  cargarComprobantes();
}

// 👇 Hacemos que sean accesibles desde el HTML inline
window.aprobar = aprobar;
window.rechazar = rechazar;
