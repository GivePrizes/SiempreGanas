// assets/js/participante/ruleta.js

// API base (usar la global definida en config.js)
const API = `${window.API_URL.replace(/\/$/, '')}/api`;
// sorteoId
const params = new URLSearchParams(window.location.search);
const sorteoIdParam = params.get('sorteo') || params.get('sorteoId');
const sorteoId = sorteoIdParam ? parseInt(sorteoIdParam, 10) : null;

// DOM
const tituloSorteo = document.getElementById('tituloSorteo');
const subtituloSorteo = document.getElementById('subtituloSorteo');

const ruletaCircle = document.getElementById('ruletaCircle');
const resultadoRuleta = document.getElementById('resultadoRuleta');

const estadoTextoEl = document.getElementById('estadoTexto');
const estadoDotEl = document.getElementById('estadoDot');
const horaProgramadaTextoEl = document.getElementById('horaProgramadaTexto');
const contadorTextoEl = document.getElementById('contadorTexto');
const ruletaHint = document.getElementById('ruletaHint');

const misNumerosWrap = document.getElementById('misNumerosWrap');
const winSoundEl = document.getElementById('winSound');

// Auth
const token = localStorage.getItem('token');
if (!token) {
  const redirect = encodeURIComponent(`participante/ruleta.html?sorteo=${sorteoIdParam || ''}`);
  location.href = `../login.html?redirect=${redirect}`;
}

// Estado
let ruletaInfo = null;
let misNumeros = [];

let countdownInterval = null;
let pollingInterval = null;
let refreshMisNumerosInterval = null;

let rotacionActual = 0;

// --- celebración / anti-repetición ---
const celebrationKey = sorteoId ? `celebrated_ruleta_${sorteoId}` : `celebrated_ruleta_unknown`;
let alreadyCelebrated = sessionStorage.getItem(celebrationKey) === '1';

// --- audio unlock (móviles) ---
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  if (!winSoundEl) return;
  // Intento silencioso para “desbloquear”
  winSoundEl.volume = 0;
  winSoundEl.play()
    .then(() => {
      winSoundEl.pause();
      winSoundEl.currentTime = 0;
      winSoundEl.volume = 1;
      audioUnlocked = true;
    })
    .catch(() => {
      // Si falla, igual marcamos al primer gesto (y reintentamos al celebrar)
      audioUnlocked = true;
      if (winSoundEl) winSoundEl.volume = 1;
    });
}
window.addEventListener('click', unlockAudioOnce, { once: true });
window.addEventListener('touchstart', unlockAudioOnce, { once: true });

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

// ==========================
// Helpers UI
// ==========================
function setEstadoBadge(estado) {
  if (!estadoTextoEl || !estadoDotEl) return;

  estadoTextoEl.textContent = estado || '---';

  estadoDotEl.classList.remove('estado-no_programada', 'estado-programada', 'estado-finalizada');
  if (estado === 'programada') estadoDotEl.classList.add('estado-programada');
  else if (estado === 'finalizada') estadoDotEl.classList.add('estado-finalizada');
  else estadoDotEl.classList.add('estado-no_programada');
}

function renderMisNumeros() {
  if (!misNumerosWrap) return;

  if (!misNumeros.length) {
    misNumerosWrap.innerHTML = `<span class="text-muted">Aún no tienes números aprobados en este sorteo.</span>`;
    return;
  }

  misNumerosWrap.innerHTML = misNumeros
    .map((n) => `<span class="chip" data-num="${n}">#${String(n).padStart(2, '0')}</span>`)
    .join('');
}

function marcarGanadorEnMisNumeros(numeroGanador) {
  if (!misNumerosWrap || !numeroGanador) return;
  const chip = misNumerosWrap.querySelector(`.chip[data-num="${numeroGanador}"]`);
  if (chip) chip.classList.add('chip-ganador');
}

// ==========================
// Ruleta visual (estética)
// - Muestra SOLO tus números (como querías)
// ==========================
function construirRuletaDesdeMisNumeros(numeros) {
  if (!ruletaCircle) return;

  ruletaCircle.innerHTML = '';

  if (!Array.isArray(numeros) || numeros.length === 0) {
    ruletaCircle.innerHTML =
      `<p style="text-align:center; padding:1rem;" class="text-muted">Sin números para mostrar.</p>`;
    return;
  }

  const total = numeros.length;
  const anguloSlice = 360 / total;

  const maxLabels = 22;
  const pasoLabel = total <= maxLabels ? 1 : Math.ceil(total / maxLabels);

  numeros.forEach((numero, index) => {
    const slice = document.createElement('div');
    slice.className = 'ruleta-slice';

    const anguloInicio = index * anguloSlice;
    slice.style.transform = `rotate(${anguloInicio}deg) skewY(${90 - anguloSlice}deg)`;

    const mostrarLabel = index % pasoLabel === 0;
    slice.innerHTML = mostrarLabel ? `<span class="slice-num">#${numero}</span>` : '';

    ruletaCircle.appendChild(slice);
  });

  // mantener rotación actual
  ruletaCircle.style.transform = `rotate(${rotacionActual}deg)`;
}

// ==========================
// Fetchers
// ==========================
async function fetchRuletaInfo() {
  if (!sorteoId) return;

  try {
    const res = await fetch(`${API}/sorteos/${sorteoId}/ruleta-info`, {
      headers: authHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Error ruleta-info:', data);
      return;
    }

    ruletaInfo = data;
    renderRuletaInfo();
  } catch (err) {
    console.error('Error fetchRuletaInfo:', err);
  }
}

async function fetchMisNumeros() {
  if (!sorteoId) return;

  try {
    const res = await fetch(`${API}/participante/mis-numeros?sorteoId=${sorteoId}`, {
      headers: authHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Error mis-numeros:', data);
      return;
    }

    misNumeros = Array.isArray(data.numeros) ? data.numeros : [];
    renderMisNumeros();
    construirRuletaDesdeMisNumeros(misNumeros);
  } catch (err) {
    console.error('Error fetchMisNumeros:', err);
  }
}

// ==========================
// Render / contador
// ==========================
function renderRuletaInfo() {
  if (!ruletaInfo) return;

  const {
    descripcion,
    premio,
    ruleta_estado,
    ruleta_hora_programada,
    numero_ganador,
    ganador,
  } = ruletaInfo;

  if (tituloSorteo) tituloSorteo.textContent = descripcion ? `🎰 ${descripcion}` : 'Sala de ruleta';
  if (subtituloSorteo) subtituloSorteo.textContent = premio ? `Premio: ${premio}` : 'Resultado oficial y verificado.';

  setEstadoBadge(ruleta_estado);

  if (horaProgramadaTextoEl) {
    if (ruleta_hora_programada) {
      horaProgramadaTextoEl.textContent = new Date(ruleta_hora_programada).toLocaleString(
        'es-CO',
        { timeZone: 'America/Bogota', hour12: false }
      );
    } else {
      horaProgramadaTextoEl.textContent = 'Sin programar';
    }
  }

  if (ruletaHint) {
    if (ruleta_estado === 'no_programada') {
      ruletaHint.textContent = 'El sorteo está completo. El admin programará la ruleta pronto.';
    } else if (ruleta_estado === 'programada') {
      ruletaHint.textContent = 'Quédate aquí: cuando llegue la hora, verás el resultado premium.';
    } else {
      ruletaHint.textContent = 'Resultado oficial registrado.';
    }
  }

  // ✅ Finalizada: mostrar ganador + celebrar 1 vez
  if (ruleta_estado === 'finalizada' && numero_ganador) {
    const nombreCorto = ganador?.nombre ? ganador.nombre.split(' ')[0] : 'Ganador';

    if (resultadoRuleta) {
      resultadoRuleta.innerHTML = `✅ Número ganador: <strong>#${numero_ganador}</strong> — <strong>${nombreCorto}</strong>`;
    }

    // resaltar si es tuyo
    marcarGanadorEnMisNumeros(numero_ganador);

    // celebrar 1 vez
    celebrarGanadorOnce(numero_ganador);

    // parar contador (polling lo puedes dejar o parar; yo lo paro para estabilidad)
    stopCountdown();

    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (contadorTextoEl) contadorTextoEl.textContent = '00:00:00';

    return;
  }

  // Si no está finalizada, mantener countdown (solo si programada)
  iniciarCountdown();
}

function iniciarCountdown() {
  stopCountdown();

  if (
    !ruletaInfo ||
    ruletaInfo.ruleta_estado !== 'programada' ||
    !ruletaInfo.ruleta_hora_programada ||
    !contadorTextoEl
  ) {
    if (contadorTextoEl) contadorTextoEl.textContent = '--:--:--';
    return;
  }

  const target = new Date(ruletaInfo.ruleta_hora_programada).getTime();
  const overlay = document.getElementById('countdownOverlay');
  const bigEl = document.getElementById('countdownBig');
  const motivationalEl = document.getElementById('motivationalMsg');
  const frases = [
    "¡Ya casi llega tu momento!",
    "La suerte está girando contigo…",
    "Prepárate, el destino se acerca…",
    "¿Será tu número el elegido?",
  ];

  function actualizar() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      contadorTextoEl.textContent = '00:00:00';
      if (overlay) overlay.style.display = 'none';
      stopCountdown();
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    contadorTextoEl.textContent = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');

    if (totalSeconds <= 10 && overlay && bigEl) {
      overlay.style.display = 'flex';
      bigEl.textContent = totalSeconds;
    } else if (overlay) {
      overlay.style.display = 'none';
    }

    if (motivationalEl && totalSeconds % 5 === 0) {
      motivationalEl.textContent = frases[Math.floor(Math.random() * frases.length)];
    }
  }

  actualizar();
  countdownInterval = setInterval(actualizar, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  const overlay = document.getElementById('countdownOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ==========================
// 🎉 Celebración premium (1 vez)
// ==========================
function celebrarGanadorOnce(numeroGanador) {
  if (alreadyCelebrated) return;
  alreadyCelebrated = true;
  sessionStorage.setItem(celebrationKey, '1');

  // 1) mini spin (1–2 vueltas) SOLO estética (no “cae” exacto en ganador)
  miniSpin();

  // 2) confetti
  setTimeout(() => {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } }), 180);
    }
  }, 650);

  // 3) sonido win
  setTimeout(() => {
    if (winSoundEl) {
      try {
        winSoundEl.currentTime = 0;
        winSoundEl.volume = 1;
        winSoundEl.play().catch(() => {
          // Si el navegador lo bloquea, no rompemos nada.
        });
      } catch (_) {}
    }
  }, 500);

  // 4) si el ganador está en mis números: resaltar también en la ruleta
  if (Array.isArray(misNumeros) && misNumeros.includes(numeroGanador)) {
    resaltarSliceGanador(numeroGanador);
    if (resultadoRuleta) {
      resultadoRuleta.innerHTML += `<br/><span class="text-muted">🎯 ¡Ese número es tuyo!</span>`;
    }
  } else {
    if (resultadoRuleta) {
      resultadoRuleta.innerHTML += `<br/><span class="text-muted">Sigue atento: viene el próximo sorteo 🎰</span>`;
    }
  }
}

function miniSpin() {
  if (!ruletaCircle) return;

  // transición suave
  ruletaCircle.style.transition = 'transform 1.25s cubic-bezier(.1,.9,.2,1)';
  const vueltas = 1 + Math.floor(Math.random() * 2); // 1–2
  const extra = Math.floor(Math.random() * 120);     // un toque random
  const destino = rotacionActual + vueltas * 360 + extra;

  ruletaCircle.style.transform = `rotate(${destino}deg)`;
  rotacionActual = destino;

  // limpiar transition para futuras rotaciones si recargas datos
  setTimeout(() => {
    if (!ruletaCircle) return;
    ruletaCircle.style.transition = '';
  }, 1400);
}

function resaltarSliceGanador(numeroGanador) {
  if (!ruletaCircle) return;
  const total = misNumeros.length;
  if (!total) return;

  const idx = misNumeros.findIndex((n) => n === numeroGanador);
  if (idx < 0) return;

  const slices = Array.from(ruletaCircle.querySelectorAll('.ruleta-slice'));
  slices.forEach((s) => s.classList.remove('ganador'));
  if (slices[idx]) slices[idx].classList.add('ganador');
}

// ==========================
// Init
// ==========================
async function init() {
  if (!sorteoId) {
    if (tituloSorteo) tituloSorteo.textContent = 'Sorteo no especificado';
    if (subtituloSorteo) subtituloSorteo.textContent = 'Vuelve al dashboard y entra desde tu sorteo.';
    return;
  }

  await fetchRuletaInfo();
  await fetchMisNumeros();

  // polling (ruleta-info) cada 3s
  pollingInterval = setInterval(fetchRuletaInfo, 3000);

  // refrescar mis números cada 10s (por si aprueban mientras miras)
  refreshMisNumerosInterval = setInterval(fetchMisNumeros, 10000);
}

init();
