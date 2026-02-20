// frontend/assets/js/admin/comprobantes.js

const API_URL = window.API_URL || '';

function agruparComprobantesPorSorteo(comprobantes) {
  const mapa = new Map();

  for (const c of comprobantes) {
    const id = c.sorteo_id;
    if (!mapa.has(id)) {
      mapa.set(id, {
        sorteo_id: id,
        sorteo: c.sorteo,
        comprobantes: [],
      });
    }
    mapa.get(id).comprobantes.push(c);
  }

  return Array.from(mapa.values());
}

// Estado para evitar parpadeo
let yaPintoAlgo = false;
let ultimoHTML = '';

// Mini estado "actualizando..." sin borrar el contenedor
function setMiniEstado(texto) {
  const contenedor = document.getElementById('comprobantes');
  if (!contenedor) return;

  let el = contenedor.querySelector('.mini-estado');
  if (!el) {
    el = document.createElement('div');
    el.className = 'mini-estado';
    contenedor.prepend(el);
  }

  el.textContent = texto || '';
  el.style.display = texto ? 'block' : 'none';
}

function construirHTML(grupos) {
  if (!grupos.length) {
    return '<p>No hay pendientes.</p>';
  }

  return grupos
    .map((grupo) => {
      const items = grupo.comprobantes
        .map(
          (c) => `
          <li class="comprobante-item">
            <div class="comprobante-info">
              <strong>#${c.numero}</strong> - ${c.usuario} (${c.telefono})
              <br>
              <a href="${c.comprobante_url}" target="_blank" class="link">
                Ver comprobante
              </a>
              <br>
              <small>${new Date(c.fecha).toLocaleString()}</small>
            </div>
            <div class="comprobante-actions">
              <button class="btn-green" onclick="aprobar(${c.id})">Aprobar</button>
              <button class="btn-red" onclick="rechazar(${c.id})">Rechazar</button>
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

export async function cargarComprobantes() {
  const contenedor = document.getElementById('comprobantes');
  if (!contenedor) return;

  if (!yaPintoAlgo) {
    contenedor.innerHTML = '<p class="loading">Cargando comprobantes...</p>';
  } else {
    setMiniEstado('Actualizando...');
  }

  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/admin/comprobantes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  setMiniEstado('');

  if (res.status === 401 || res.status === 403) {
    contenedor.innerHTML =
      '<p>No tienes permisos o tu sesión expiró. Vuelve a iniciar sesión.</p>';
    yaPintoAlgo = true;
    ultimoHTML = contenedor.innerHTML;
    return;
  }

  if (!res.ok) {
    console.error('Error al cargar comprobantes:', res.status);

    if (!yaPintoAlgo) {
      contenedor.innerHTML = '<p>Error al cargar comprobantes.</p>';
      ultimoHTML = contenedor.innerHTML;
    }
    yaPintoAlgo = true;
    return;
  }

  const data = await res.json();
  const grupos = agruparComprobantesPorSorteo(data);

  const nuevoHTML = construirHTML(grupos);

  if (nuevoHTML !== ultimoHTML) {
    contenedor.innerHTML = nuevoHTML;
    ultimoHTML = nuevoHTML;
  }

  yaPintoAlgo = true;
}

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

window.aprobar = aprobar;
window.rechazar = rechazar;
