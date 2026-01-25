// assets/js/bonus.js

/**
 * Carga el progreso del bono desde el backend
 * y lo renderiza si existe sesión activa.
 */
export async function cargarProgresoBono() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${window.API_URL}/api/bonus/progreso`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.warn('No se pudo cargar el progreso del bono');
      return;
    }

    const data = await res.json();
    renderBono(data);

  } catch (err) {
    console.error('Error cargando bono:', err);
  }
}

/**
 * Renderiza el bono de fidelidad en el dashboard
 */
function renderBono(data) {
  const box  = document.getElementById('bonus-box');
  const text = document.getElementById('bonus-text');
  const bar  = document.getElementById('bonus-progress');

  // Si el dashboard no tiene bono, salimos sin romper nada
  if (!box || !text || !bar) return;

  // 🔓 Mostrar el bloque (HTML viene oculto)
  box.style.display = 'block';

  const objetivo = Number(data.bonus_objetivo || 0);
  const aprobados = Number(data.total_aprobados || 0);

  const porcentaje = objetivo > 0
    ? Math.min((aprobados / objetivo) * 100, 100)
    : 0;

  bar.style.width = `${porcentaje}%`;

  if (data.bonus_entregado) {
    text.innerHTML = `
      ✅ <strong>Bono desbloqueado</strong><br>
      Te enviaremos tu cuenta <strong>GRATIS</strong> por WhatsApp.
    `;
  } else {
    const faltan = Number(data.faltan ?? Math.max(objetivo - aprobados, 0));

    text.innerHTML = `
      Has completado <strong>${aprobados}</strong> de ${objetivo}<br>
      🔥 Te faltan <strong>${faltan}</strong> para tu cuenta <strong>GRATIS</strong>
    `;
  }
}
