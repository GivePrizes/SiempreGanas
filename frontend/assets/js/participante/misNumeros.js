// assets/js/participante/misNumeros.js

const API_URL = window.API_URL; // viene de config.js

// Para el dashboard (sólo la cifra total)
export async function cargarMisNumerosResumen() {
  const token = localStorage.getItem('token');
  const stat = document.getElementById('statMisNumeros');

  if (!token || !stat) return;

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error('Error HTTP en mis-participaciones (resumen):', res.status);
      stat.textContent = '—';
      return;
    }

    const data = await res.json();
    const totalNumeros = Array.isArray(data) ? data.length : 0;
    stat.textContent = totalNumeros || '0';
  } catch (err) {
    console.error(err);
    stat.textContent = '—';
  }
}

// Para la página mis-numeros.html (agrupado por sorteo)
export async function cargarMisNumerosDetalle() {
  const token = localStorage.getItem('token');
  const contenedor = document.getElementById('misNumeros');

  if (!token || !contenedor) return;

  contenedor.innerHTML = '<p class="loading">Cargando tus participaciones...</p>';

  try {
    const res = await fetch(`${API_URL}/api/participante/mis-participaciones`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error('Error HTTP en mis-participaciones (detalle):', res.status);
      contenedor.innerHTML =
        '<p class="error">No se pudieron cargar tus números. Intenta más tarde.</p>';
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      contenedor.innerHTML =
        '<p class="empty">Aún no has participado en ningún sorteo.</p>';
      return;
    }

    // === Agrupar por sorteo_id ===
    const grupos = {}; // { sorteo_id: { descripcion, premio, numeros: [], aprobados, pendientes, rechazados } }

    data.forEach((p) => {
      const sorteoId = p.sorteo_id;
      if (!grupos[sorteoId]) {
        grupos[sorteoId] = {
          sorteo_id: sorteoId,
          descripcion: p.descripcion,
          premio: p.premio,
          numeros: [],
          aprobados: 0,
          pendientes: 0,
          rechazados: 0,
        };
      }

      const grupo = grupos[sorteoId];
      grupo.numeros.push(p.numero);

      const estado = (p.estado || '').toLowerCase();
      if (estado === 'aprobado') grupo.aprobados += 1;
      else if (estado === 'pendiente') grupo.pendientes += 1;
      else if (estado) grupo.rechazados += 1;
    });

    // === Pintar 1 card por sorteo ===
    contenedor.innerHTML = '';

    Object.values(grupos).forEach((grupo) => {
      const card = document.createElement('article');
      card.className = 'sorteo-card';

      const numerosTexto =
        grupo.numeros && grupo.numeros.length
          ? grupo.numeros
              .slice()
              .sort((a, b) => a - b)
              .join(', ')
          : '—';

      const badges = [];

      if (grupo.aprobados) {
        badges.push(
          `<span class="badge badge-success">Aprobados: ${grupo.aprobados}</span>`
        );
      }
      if (grupo.pendientes) {
        badges.push(
          `<span class="badge badge-warning">Pendientes: ${grupo.pendientes}</span>`
        );
      }
      if (grupo.rechazados) {
        badges.push(
          `<span class="badge badge-danger">Rechazados: ${grupo.rechazados}</span>`
        );
      }

      card.innerHTML = `
        <div class="sorteo-content">
          <h3 class="sorteo-title">${grupo.descripcion}</h3>
          <p class="text-muted">Premio: ${grupo.premio}</p>

          <p class="resumen-linea">
            <strong>Números:</strong>
            <span>${numerosTexto}</span>
          </p>

          <p class="resumen-linea">
            ${badges.length ? badges.join(' ') : '<span class="text-muted">Sin estado registrado</span>'}
          </p>

          <div class="cta" style="margin-top:10px;">
            <a href="sorteo.html?id=${grupo.sorteo_id}" class="btn btn-primary">
              Ver sorteo
            </a>
          </div>
        </div>
      `;

      contenedor.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    contenedor.innerHTML =
      '<p class="error">Error de conexión al cargar tus números.</p>';
  }
}
