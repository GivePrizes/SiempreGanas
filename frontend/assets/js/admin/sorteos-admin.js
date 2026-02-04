const API_URL = window.API_URL || '';

export async function cargarSorteosAdmin() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') {
    // No mostramos error aquí, el panel general ya se encargará
    return;
  }

  const cont = document.getElementById('sorteosAdmin');
  if (!cont) return;

  try {
    const res = await fetch(`${API_URL}/api/sorteos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error cargando sorteos para admin:', data);
      cont.innerHTML = '<p>Error al cargar sorteos.</p>';
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      cont.innerHTML = '<p>Aún no tienes sorteos creados. Empieza con el botón “Crear sorteo”.</p>';
      return;
    }

    cont.innerHTML = data
      .map(s => {
        const ocupacion = `${s.ocupados} / ${s.cantidad_numeros}`;
        const lleno = s.estado === 'lleno';
        const finalizado = s.estado === 'finalizado';

        let estadoLabel = '';
        if (finalizado) {
          estadoLabel = '<span class="badge badge-danger">Finalizado</span>';
        } else if (lleno) {
          estadoLabel = '<span class="badge badge-warning">Lleno — Listo para ruleta</span>';
        } else {
          estadoLabel = '<span class="badge badge-success">En venta</span>';
        }

        const btnRuleta = lleno
          ? `<div class="ruleta-actions-admin">
              <button class="btn btn-secondary btn-sm" onclick="location.href='ruleta.html?sorteo=${s.id}'">
                🎰 Lanzar ruleta
              </button>
              <button class="btn btn-ghost btn-sm" onclick="window.open('../participante/ruleta-live.html?id=${s.id}', '_blank', 'noopener')">
                👁 Ver ruleta live
              </button>
            </div>`
          : '';

        const imagenHtml = s.imagen_url
          ? `<div class="sorteo-admin-image">
               <img src="${s.imagen_url}" alt="Imagen sorteo ${s.descripcion}">
             </div>`
          : '';

        return `
          <article class="sorteo-card-admin">
            ${imagenHtml}
            <div class="sorteo-admin-body">
              <div class="sorteo-header-admin">
                <h3>${s.descripcion}</h3>
                ${estadoLabel}
              </div>
              <p class="sorteo-detalle">Premio: <strong>${s.premio}</strong></p>
              <p class="sorteo-detalle">Ocupación: <strong>${ocupacion}</strong></p>
              <p class="sorteo-detalle-mini">
                ${
                  lleno
                    ? 'Este sorteo ya está completo. Puedes lanzar la ruleta en vivo y crear expectativa con los participantes.'
                    : 'Aún se están vendiendo números. Cuantos más participen, más fuerte se siente el momento del sorteo.'
                }
              </p>
              <div class="sorteo-actions-admin">
                ${btnRuleta}
                <button class="btn btn-warning btn-sm" onclick="editarSorteo(${s.id})">
                  ✏️ Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="eliminarSorteo(${s.id})">
                  🗑 Eliminar
                </button>
                <button class="btn btn-primary btn-sm" onclick="verDetalleSorteo(${s.id})">
                  👁 Ver detalle
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  } catch (err) {
    console.error(err);
    cont.innerHTML = '<p>Error de conexión al cargar los sorteos.</p>';
  }
}

// 🌟 Función para EDITAR sorteo
function editarSorteo(id) {
  location.href = `crear-sorteo.html?id=${id}`;
}

// 🌟 Función para ELIMINAR sorteo
async function eliminarSorteo(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sesión expirada. Vuelve a iniciar sesión.');
    return;
  }

  const confirmar = confirm('¿Seguro que quieres ELIMINAR este sorteo? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  try {
    const res = await fetch(`${API_URL}/api/sorteos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('Error al eliminar sorteo:', data);
      alert(data.error || 'No se pudo eliminar el sorteo.');
      return;
    }

    // Recargar la lista
    await cargarSorteosAdmin();
  } catch (err) {
    console.error('Error de red al eliminar sorteo:', err);
    alert('Error de conexión al intentar eliminar el sorteo.');
  }
}

// 🌟 Función para VER DETALLE sorteo (nuevo)
function verDetalleSorteo(id) {
  location.href = `sorteo-detalle.html?id=${id}`;
}

// Hacemos accesibles las funciones desde el HTML inline
window.editarSorteo = editarSorteo;
window.eliminarSorteo = eliminarSorteo;
window.verDetalleSorteo = verDetalleSorteo;
