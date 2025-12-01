export async function cargarMisNumeros() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/participante/mis-participaciones`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const participaciones = await res.json();

  document.getElementById('misNumeros').innerHTML = participaciones.map(p => `
    <div class="sorteo-card ${p.estado}">
      <h3>${p.descripcion}</h3>
      <p><strong>Número:</strong> ${p.numero}</p>
      <p><strong>Estado:</strong> ${p.estado}</p>
      <p><strong>Premio:</strong> ${p.premio || '—'}</p>
    </div>
  `).join('') || '<p>No tienes participaciones aún 🎯</p>';
}