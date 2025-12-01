async function cargarSorteos() {
  const res = await fetch(`${API_URL}/sorteos`);
  const sorteos = await res.json();
  document.getElementById('sorteos').innerHTML = sorteos.map(s => `
    <div class="sorteo-card">
      <h3>${s.descripcion}</h3>
      <p>Premio: ${s.premio}</p>
      <p>Precio por número: $${s.precio_numero}</p>
      <p>Ocupados: ${s.ocupados}/${s.cantidad_numeros}</p>
      <button class="btn-red" onclick="participar(${s.id})">¡PARTICIPAR AHORA!</button>
    </div>
  `).join('');
}

async function participar(id) {
  const numeros = prompt('Elige 1-5 números (separados por coma):');
  if (!numeros) return;
  const nums = numeros.split(',').map(n => parseInt(n.trim())).filter(n => n > 0);
  if (nums.length < 1 || nums.length > 5) return alert('Elige 1-5 números válidos');

  const file = prompt('Sube comprobante (base64 o URL):'); // En producción usa input file
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}/participante/guardar-numeros`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sorteo_id: id, numeros: nums, comprobante: file })
    });
    const data = await res.json();
    if (res.ok) {
      alert('✅ Participación enviada! Esperando aprobación');
    } else {
      alert('❌ ' + data.error);
    }
  } catch (err) {
    alert('❌ Error');
  }
}