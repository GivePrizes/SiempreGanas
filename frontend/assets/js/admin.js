async function cargarComprobantes() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/admin/comprobantes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  document.getElementById('comprobantes').innerHTML = data.map(c => `
    <div class="comprobante">
      <h3>${c.usuario} - ${c.sorteo}</h3>
      <p>Número: ${c.numero} | ${new Date(c.fecha).toLocaleString()}</p>
      ${c.comprobante_url ? `<img src="${c.comprobante_url}" width="200" alt="Comprobante">` : '<p>Sin imagen</p>'}
      <div>
        <button class="btn-green" onclick="aprobar(${c.id})">✅ Aprobar</button>
        <button class="btn-red" onclick="rechazar(${c.id})">❌ Rechazar</button>
      </div>
    </div>
  `).join('') || '<p>¡No hay pendientes! 🎉</p>';
}

async function aprobar(id) {
  if (!confirm('¿Aprobar?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/admin/comprobantes/aprobar/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  cargarComprobantes();
}

async function rechazar(id) {
  if (!confirm('¿Rechazar?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/admin/comprobantes/rechazar/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  cargarComprobantes();
}