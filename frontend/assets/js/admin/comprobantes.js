// frontend/assets/js/admin/comprobantes.js

// 👇 EXPORTAMOS la función para que index.js la pueda importar
export async function cargarComprobantes() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/admin/comprobantes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.status === 401 || res.status === 403) {
    document.getElementById('comprobantes').innerHTML =
      '<p>No tienes permisos o tu sesión expiró. Vuelve a iniciar sesión.</p>';
    console.warn('No autorizado en /api/admin/comprobantes');
    return;
  }

  if (!res.ok) {
    console.error('Error al cargar comprobantes:', res.status);
    document.getElementById('comprobantes').innerHTML =
      '<p>Error al cargar comprobantes.</p>';
    return;
  }

  const data = await res.json();

  document.getElementById('comprobantes').innerHTML =
    data.map(c => `
      <div class="comprobante">
        <h3>${c.usuario} - ${c.sorteo}</h3>
        <p>Número: ${c.numero} | ${new Date(c.fecha).toLocaleString()}</p>
        ${
          c.comprobante_url
            ? `<img src="${c.comprobante_url}" width="200" alt="Comprobante">`
            : '<p>Sin imagen</p>'
        }
        <div>
          <button class="btn-green" onclick="aprobar(${c.id})">✅ Aprobar</button>
          <button class="btn-red" onclick="rechazar(${c.id})">❌ Rechazar</button>
        </div>
      </div>
    `).join('') || '<p>¡No hay pendientes! 🎉</p>';
}

// Estas dos funciones se usan desde el HTML con onclick="..."
// En módulos NO se vuelven globales, así que las colgamos de window:
async function aprobar(id) {
  if (!confirm('¿Aprobar?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/admin/comprobantes/aprobar/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  cargarComprobantes();
}

async function rechazar(id) {
  if (!confirm('¿Rechazar?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/admin/comprobantes/rechazar/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  cargarComprobantes();
}

// 👇 Hacemos que sean accesibles desde el HTML inline
window.aprobar = aprobar;
window.rechazar = rechazar;
