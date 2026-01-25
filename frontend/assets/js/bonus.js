// frontend/assets/js/bonus.js

export async function cargarProgresoBono() {
  try {
    const res = await fetch('/api/bonus/progreso', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!res.ok) return;

    const data = await res.json();
    renderBono(data);
  } catch (err) {
    console.error('Error cargando bono:', err);
  }
}

function renderBono(data) {
  const text = document.getElementById('bonus-text');
  const bar = document.getElementById('bonus-progress');

  const porcentaje = Math.min(
    (data.total_aprobados / data.bonus_objetivo) * 100,
    100
  );

  bar.style.width = `${porcentaje}%`;

  if (data.bonus_entregado) {
    text.innerHTML = '✅ <strong>Bono desbloqueado</strong><br>Te enviaremos tu cuenta GRATIS por WhatsApp.';
  } else {
    text.innerHTML = `
      Has completado <strong>${data.total_aprobados}</strong> de ${data.bonus_objetivo}<br>
      🔥 Te faltan <strong>${data.faltan}</strong> para tu cuenta <strong>GRATIS</strong>
    `;
  }
}
