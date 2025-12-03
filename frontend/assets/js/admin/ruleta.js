// assets/js/admin/ruleta.js

// 1) Obtener ID de sorteo desde la URL: ruleta.html?sorteo=123
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('sorteo');

const tituloSorteo = document.getElementById('tituloSorteo');
const subtituloSorteo = document.getElementById('subtituloSorteo');
const ruletaLista = document.getElementById('ruletaLista');
const resultadoRuleta = document.getElementById('resultadoRuleta');
const btnGirar = document.getElementById('btnGirar');

let participantes = [];

if (!sorteoId) {
  tituloSorteo.textContent = 'Sorteo no especificado';
  subtituloSorteo.textContent = 'Vuelve al panel y entra desde el botón de ruleta.';
  btnGirar.disabled = true;
}

// 2) Cargar datos para la ruleta desde el backend
async function cargarRuleta() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') {
    alert('No estás autorizado para ver esta ruleta.');
    location.href = '../index.html';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/sorteos/${sorteoId}/ruleta`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error ruleta:', data);
      tituloSorteo.textContent = data.error || 'Error al cargar ruleta';
      btnGirar.disabled = true;
      return;
    }

    const { sorteo, participantes: parts } = data;
    participantes = parts;

    tituloSorteo.textContent = `${sorteo.descripcion} — Premio: ${sorteo.premio}`;
    subtituloSorteo.textContent = `Números aprobados: ${participantes.length} / ${sorteo.cantidad_numeros}. 
Hazlo emocionante: que todos vean que aquí la suerte es transparente.`;

    if (participantes.length === 0) {
      ruletaLista.innerHTML = '<p>No hay participantes aprobados todavía.</p>';
      btnGirar.disabled = true;
      return;
    }

    // Pintar todos los participantes como “segmentos”
    ruletaLista.innerHTML = participantes
      .map(p => `
        <div class="ruleta-item">
          <span class="num">#${p.numero}</span>
          <span class="nombre">${p.nombre_corto}</span>
        </div>
      `)
      .join('');
  } catch (err) {
    console.error(err);
    tituloSorteo.textContent = 'Error de conexión al cargar la ruleta.';
    btnGirar.disabled = true;
  }
}

// 3) Girar ruleta con animación y ganador “real” desde backend
async function girarRuleta() {
  if (participantes.length === 0) {
    alert('No hay participantes aprobados.');
    return;
  }

  const confirmar = confirm(
    'Este giro registrará al ganador de forma definitiva.\n\n¿Deseas continuar?'
  );
  if (!confirmar) return;

  btnGirar.disabled = true;
  resultadoRuleta.textContent = 'Girando ruleta... 🎰✨';

  const token = localStorage.getItem('token');

  let res, data;
  try {
    res = await fetch(`${API_URL}/api/sorteos/${sorteoId}/realizar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    data = await res.json();
  } catch (err) {
    console.error('Error al realizar sorteo:', err);
    resultadoRuleta.textContent = 'Error al conectar con el servidor.';
    btnGirar.disabled = false;
    return;
  }

  if (!res.ok) {
    console.error('Error al realizar sorteo:', data);
    resultadoRuleta.textContent = data.error || 'Error al realizar sorteo.';
    btnGirar.disabled = false;
    return;
  }

  const numeroGanador = data.ganador;
  const ganador = participantes.find(p => p.numero === numeroGanador) || null;

  // Anime la “ruleta”: recorre los items varias veces y termina en el ganador
  const items = Array.from(document.querySelectorAll('.ruleta-item'));
  let indexActual = 0;
  let vueltas = 30 + Math.floor(Math.random() * 15); // vueltas para dramatismo

  const interval = setInterval(() => {
    items.forEach(el => el.classList.remove('active'));

    const item = items[indexActual];
    if (item) item.classList.add('active');

    indexActual = (indexActual + 1) % items.length;
    vueltas--;

    if (vueltas <= 0) {
      clearInterval(interval);

      // Marcar solo al ganador
      items.forEach(el => el.classList.remove('active', 'ganador'));

      const idxGanador = participantes.findIndex(p => p.numero === numeroGanador);
      if (idxGanador >= 0) {
        const itemGanador = items[idxGanador];
        if (itemGanador) {
          itemGanador.classList.add('ganador');
          itemGanador.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // Mensaje final con psicología de impacto
      resultadoRuleta.classList.add('ganador-texto');
      resultadoRuleta.innerHTML = ganador
        ? `
          🎉 <strong>${ganador.nombre_corto}</strong> es el ganador con el número <strong>#${numeroGanador}</strong>.<br/>
          Llama su nombre, muéstrale el comprobante y celebra el momento: aquí todos vieron que la ruleta fue justa.
        `
        : `
          🎉 Número ganador: <strong>#${numeroGanador}</strong>.<br/>
          Revisa en el panel qué usuario tiene este número y anúncialo en voz alta.
        `;
    }
  }, 80);
}

// 4) Eventos
btnGirar.addEventListener('click', girarRuleta);

// 5) Inicializar
cargarRuleta();
