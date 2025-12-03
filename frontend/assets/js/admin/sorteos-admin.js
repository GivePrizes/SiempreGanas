// assets/js/admin/sorteos-admin.js

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
          estadoLabel = '<span class="badge badge-finalizado">Finalizado</span>';
        } else if (lleno) {
          estadoLabel = '<span class="badge badge-lleno">Lleno — Listo para ruleta</span>';
        } else {
          estadoLabel = '<span class="badge badge-activo">En venta</span>';
        }

        const btnRuleta = lleno
          ? `<button class="btn-gold btn-sm" onclick="location.href='ruleta.html?sorteo=${s.id}'">
               🎰 Lanzar ruleta
             </button>`
          : '';

        return `
          <article class="sorteo-card-admin">
            <div class="sorteo-header">
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
