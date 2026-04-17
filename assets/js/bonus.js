// assets/js/bonus.js

export async function cargarProgresoBono() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${window.API_URL}/api/bonus/progreso`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return;

    const data = await res.json();
    renderBono(data);
  } catch (err) {
    console.error('Error cargando bono:', err);
  }
}

function renderBono(data) {
  const box = document.getElementById('bonusMini');
  const text = document.getElementById('bonusMiniText');
  const bar = document.getElementById('bonusMiniBar');

  if (!box || !text || !bar) return;

  box.removeAttribute('hidden');

  const objetivo = Number(data?.bonus_objetivo || 0);
  const aprobados = Number(data?.total_aprobados || 0);
  const faltan = Number(data?.faltan ?? Math.max(objetivo - aprobados, 0));
  const porcentaje = objetivo > 0
    ? Math.min((aprobados / objetivo) * 100, 100)
    : 0;

  bar.style.width = `${porcentaje}%`;

  if (data?.bonus_entregado) {
    text.innerHTML = `
      <span class="bonus-mini__eyebrow">Cuenta asegurada</span>
      <strong>Bono desbloqueado</strong>
      <span class="bonus-mini__meta">
        Completaste ${objetivo} numeros aprobados. Te enviaremos tu cuenta GRATIS por WhatsApp.
      </span>
    `;
    return;
  }

  text.innerHTML = `
    <span class="bonus-mini__eyebrow">Bono global</span>
    <strong>Te faltan ${faltan}</strong>
    <span class="bonus-mini__meta">
      Llevas ${aprobados} de ${objetivo} numeros aprobados para reclamar tu cuenta GRATIS.
    </span>
  `;
}
