// assets/js/participante/sorteos.js

export async function cargarSorteos() {
  const cont = document.getElementById('sorteosActivos');
  const statSorteos = document.getElementById('statSorteosActivos');
  const statProxima = document.getElementById('statProximaRuleta');

  if (!cont) return;

  cont.innerHTML = '<p>Cargando sorteos...</p>';

  try {
    const res = await fetch(`${API_URL}/api/sorteos`);
    const data = await res.json();

    if (!res.ok) {
      console.error('Error al cargar sorteos:', data);
      cont.innerHTML = '<p>Error al cargar sorteos. Intenta de nuevo en unos segundos.</p>';
      if (statSorteos) statSorteos.textContent = '—';
      if (statProxima) statProxima.textContent = '—';
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      cont.innerHTML = `
        <p>No hay sorteos activos en este momento.</p>
        <p>Vuelve pronto, estamos preparando nuevas oportunidades ✨</p>
      `;
      if (statSorteos) statSorteos.textContent = '0';
      if (statProxima) statProxima.textContent = '—';
      return;
    }

    // stats
    if (statSorteos) statSorteos.textContent = data.length.toString();

    // identificar el sorteo más avanzado para “próxima ruleta”
    const ordenados = [...data].sort((a, b) => {
      const pa = a.ocupados / a.cantidad_numeros;
      const pb = b.ocupados / b.cantidad_numeros;
      return pb - pa;
    });
    const masCercano = ordenados[0];
    if (statProxima && masCercano) {
      const faltan = masCercano.cantidad_numeros - masCercano.ocupados;
      statProxima.textContent =
        faltan <= 0
          ? 'Listo para ruleta'
          : `Faltan ${faltan} número(s) para la ruleta`;
    }

    cont.innerHTML = data
      .map(s => {
        const ocupados = s.ocupados || 0;
        const total = s.cantidad_numeros;
        const porcentaje = Math.min(
          100,
          Math.round((ocupados / total) * 100)
        );
        const faltan = total - ocupados;
        const lleno = s.estado === 'lleno' || faltan <= 0;

        let mensajeEstado = '';
        if (lleno) {
          mensajeEstado =
            'Este sorteo ya se cerró. La ruleta se lanzará en cualquier momento 🎰';
        } else if (porcentaje >= 80) {
          mensajeEstado =
            '🔥 ¡Últimos números! Estás a nada de ver la ruleta girar.';
        } else if (porcentaje >= 50) {
          mensajeEstado =
            'Ya vamos por la mitad, cada número que compras acelera la ruleta.';
        } else {
          mensajeEstado =
            'Aprovecha ahora: hay buena disponibilidad de números.';
        }

        const disabledAttr = lleno ? 'disabled' : '';
        const btnLabel = lleno ? 'Cupo lleno' : 'Participar ahora';

        return `
          <article class="sorteo-card">
            <h3>${s.descripcion}</h3>
            <p class="sorteo-premio">🎁 Premio: <strong>${s.premio}</strong></p>
            <p class="sorteo-precio">
              💸 Precio por número: <strong>$${s.precio_numero}</strong>
            </p>

            <div class="progress-wrapper">
              <div class="progress-bar">
                <div class="progress-fill" style="width:${porcentaje}%;"></div>
              </div>
              <p class="progress-text">
                ${ocupados} de ${total} números vendidos
                ${!lleno ? `• Quedan <strong>${faltan}</strong>` : ''}
              </p>
            </div>

            <p class="sorteo-mensaje">
              ${mensajeEstado}
            </p>

            <button
              class="btn-gold btn-full"
              ${disabledAttr}
              onclick="irASorteo(${s.id})"
            >
              ${btnLabel}
            </button>
          </article>
        `;
      })
      .join('');

    // pequeño CSS inline si quieres, o llévalo a premium.css
    injectParticipantStyles();
  } catch (err) {
    console.error(err);
    cont.innerHTML = '<p>Error de conexión al cargar los sorteos.</p>';
    if (statSorteos) statSorteos.textContent = '—';
    if (statProxima) statProxima.textContent = '—';
  }
}

// Navegar a la página de participar en un sorteo concreto
function irASorteo(id) {
  // podrías tener participante/sorteo.html?id=123
  location.href = `sorteo.html?id=${id}`;
}

window.irASorteo = irASorteo;

// Inyectar estilos mínimos para la barra de progreso si no los tienes
function injectParticipantStyles() {
  if (document.getElementById('sg-participante-styles')) return;

  const style = document.createElement('style');
  style.id = 'sg-participante-styles';
  style.textContent = `
    .sorteo-card {
      border-radius: 1rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.3);
    }
    .sorteo-premio, .sorteo-precio, .sorteo-mensaje {
      font-size: 0.9rem;
      margin: 0.2rem 0;
    }
    .progress-wrapper {
      margin-top: 0.6rem;
      margin-bottom: 0.4rem;
    }
    .progress-bar {
      width: 100%;
      height: 0.4rem;
      border-radius: 999px;
      background: rgba(30, 64, 175, 0.3);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #facc15);
      border-radius: 999px;
    }
    .progress-text {
      font-size: 0.75rem;
      opacity: 0.85;
      margin-top: 0.25rem;
    }
    .btn-full {
      width: 100%;
      margin-top: 0.6rem;
    }
  `;
  document.head.appendChild(style);
}
