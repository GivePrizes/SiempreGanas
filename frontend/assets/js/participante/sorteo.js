import { showToast, confeti } from './ui.js';

export async function cargarSorteos() {
  const res = await fetch(`${API_URL}/sorteos`);
  const sorteos = await res.json();

  document.getElementById('sorteos').innerHTML = sorteos.map(s => `
    <div class="sorteo-card">
      <h3>${s.descripcion}</h3>
      <p>Premio: ${s.premio}</p>
      <p>Precio por número: $${s.precio_numero}</p>
      <p>Ocupados: ${s.ocupados}/${s.cantidad_numeros}</p>
      <div class="progress">
        <div class="progress-bar" style="width:${(s.ocupados/s.cantidad_numeros)*100}%"></div>
      </div>
      <p class="countdown" id="countdown-${s.id}">⏳ Calculando...</p>
      <button class="btn-red" onclick="participar(${s.id})">¡PARTICIPAR AHORA!</button>
    </div>
  `).join('');

  // Inicializar countdowns
  sorteos.forEach(s => iniciarCountdown(s.id, s.fecha_sorteo));
}

function iniciarCountdown(id, fechaSorteo) {
  const target = new Date(fechaSorteo).getTime();
  const el = document.getElementById(`countdown-${id}`);

  function update() {
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) {
      el.textContent = "🎉 Sorteo en curso o finalizado";
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    el.textContent = `⏳ ${d}d ${h}h ${m}m ${s}s restantes`;
  }

  update();
  setInterval(update, 1000);
}

export async function participar(id) {
  const numeros = prompt('Elige 1-5 números (separados por coma):');
  if (!numeros) return;

  const nums = numeros.split(',').map(n => parseInt(n.trim())).filter(n => n > 0);
  if (nums.length < 1 || nums.length > 5) return showToast("❌ Elige 1-5 números válidos");

  const file = prompt('Sube comprobante (base64 o URL):');
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
      showToast("✅ Participación enviada! Esperando aprobación");
      confeti();
    } else {
      showToast("❌ " + data.error);
    }
  } catch (err) {
    showToast("❌ Error de conexión");
  }
}