// assets/js/admin/ruleta.js

// 1) Obtener ID de sorteo desde la URL: ruleta.html?sorteo=123
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('sorteo');

const tituloSorteo = document.getElementById('tituloSorteo');
const subtituloSorteo = document.getElementById('subtituloSorteo');
const ruletaCircle = document.getElementById('ruletaCircle');
const resultadoRuleta = document.getElementById('resultadoRuleta');
const btnGirar = document.getElementById('btnGirar');

let participantes = [];
let rotacionActual = 0;
let girando = false;

if (!sorteoId) {
  tituloSorteo.textContent = 'Sorteo no especificado';
  subtituloSorteo.textContent = 'Vuelve al panel y entra desde el botón de ruleta.';
  if (btnGirar) btnGirar.disabled = true;
}

// ---------- helpers visuales ----------

// Construir la ruleta circular con slices
function construirRuleta(participants) {
  if (!ruletaCircle) return;

  ruletaCircle.innerHTML = '';

  const total = participants.length;
  if (total === 0) return;

  const anguloSlice = 360 / total;

  participants.forEach((p, index) => {
    const slice = document.createElement('div');
    slice.className = 'ruleta-slice';

    // Ángulo donde arranca este slice
    const anguloInicio = index * anguloSlice;

    // Rotamos el “brazo” y usamos skew para formar el triángulo
    slice.style.transform =
      `rotate(${anguloInicio}deg) skewY(${90 - anguloSlice}deg)`;

    slice.innerHTML = `
      <span class="slice-num">#${p.numero}</span>
    `;

    ruletaCircle.appendChild(slice);
  });
}

// ---------- 2) Cargar datos para la ruleta desde el backend ----------

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
      if (btnGirar) btnGirar.disabled = true;
      return;
    }

    const { sorteo, participantes: parts } = data;
    participantes = parts || [];

    tituloSorteo.textContent = `${sorteo.descripcion} — Premio: ${sorteo.premio}`;
    subtituloSorteo.textContent =
      `Números aprobados: ${participantes.length} / ${sorteo.cantidad_numeros}. ` +
      `Hazlo emocionante: que todos vean que aquí la suerte es transparente.`;

    if (!participantes.length) {
      if (ruletaCircle) {
        ruletaCircle.innerHTML = '<p style="text-align:center; padding:1rem;">No hay participantes aprobados todavía.</p>';
      }
      if (btnGirar) btnGirar.disabled = true;
      return;
    }

    // Construir visualmente la ruleta circular
    construirRuleta(participantes);
    if (btnGirar) btnGirar.disabled = false;
  } catch (err) {
    console.error(err);
    tituloSorteo.textContent = 'Error de conexión al cargar la ruleta.';
    if (btnGirar) btnGirar.disabled = true;
  }
}

// ---------- 3) Girar ruleta con backend como “juez” ----------

async function girarRuleta() {
  if (girando) return;
  if (!participantes.length) {
    alert('No hay participantes aprobados.');
    return;
  }

  const confirmar = confirm(
    'Este giro registrará al ganador de forma definitiva.\n\n¿Deseas continuar?'
  );
  if (!confirmar) return;

  girando = true;
  if (btnGirar) btnGirar.disabled = true;
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
    girando = false;
    if (btnGirar) btnGirar.disabled = false;
    return;
  }

  if (!res.ok) {
    console.error('Error al realizar sorteo:', data);
    resultadoRuleta.textContent = data.error || 'Error al realizar sorteo.';
    girando = false;
    if (btnGirar) btnGirar.disabled = false;
    return;
  }

  const numeroGanador = data.ganador;
  const idxGanador = participantes.findIndex(p => p.numero === numeroGanador);
  const ganador = idxGanador >= 0 ? participantes[idxGanador] : null;

  if (!ruletaCircle) {
    // fallback por si algo raro
    resultadoRuleta.innerHTML = ganador
      ? `🎉 Ganador: <strong>${ganador.nombre_corto}</strong> con el número <strong>#${numeroGanador}</strong>.`
      : `🎉 Número ganador: <strong>#${numeroGanador}</strong>.`;
    girando = false;
    return;
  }

  const slices = Array.from(ruletaCircle.querySelectorAll('.ruleta-slice'));
  const total = participantes.length;
  const anguloSlice = 360 / total;

  const indice = idxGanador >= 0 ? idxGanador : 0;
  const anguloCentro = indice * anguloSlice + anguloSlice / 2;

  // Vueltas extra para dramatismo
  const vueltasExtra = 5 + Math.floor(Math.random() * 3); // 5–7 vueltas

  // Rotación destino: varias vueltas + llevar el centro del slice ganador al puntero (0deg)
  const rotacionDestino =
    rotacionActual +
    vueltasExtra * 360 +
    (360 - anguloCentro);

  ruletaCircle.style.transform = `rotate(${rotacionDestino}deg)`;
  rotacionActual = rotacionDestino;

  // Después de la animación (coincidir con transition de CSS: 4.5s)
  setTimeout(() => {
    // Marcar visualmente el slice ganador (opcional, si defines .ruleta-slice.ganador en CSS)
    slices.forEach(s => s.classList.remove('ganador'));
    if (slices[indice]) {
      slices[indice].classList.add('ganador');
    }

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

    setTimeout(() => {
      resultadoRuleta.classList.remove('ganador-texto');
    }, 1400);

    girando = false;
    // No volvemos a habilitar el botón porque el giro es definitivo.
  }, 4700);
}

// ---------- 4) Eventos ----------

if (btnGirar) {
  btnGirar.addEventListener('click', girarRuleta);
}

// ---------- 5) Inicializar ----------

cargarRuleta();
