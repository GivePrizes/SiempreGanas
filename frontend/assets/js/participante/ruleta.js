// assets/js/participante/ruleta.js
// Código para la página de ruleta del participante
import { initChat } from '../chat/index.js';
// API base (usar la global definida en config.js)
const API = `${(window.API_URL || 'https://app-service-phi.vercel.app').replace(/\/$/, '')}/api`;

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


// Winner float (PARTICIPANTE)
const winnerFloat = document.getElementById('winnerFloat');
const winnerFloatNumero = document.getElementById('winnerFloatNumero');
const winnerFloatNombre = document.getElementById('winnerFloatNombre');
// Número ganador grande en el centro de la ruleta
const numeroGanadorOverlay = document.getElementById('numeroGanadorOverlay');
const numeroGanadorBig = document.getElementById('numeroGanadorBig');

// Auth
const token = localStorage.getItem('token');
if (!token) {
  const redirect = encodeURIComponent(`participante/ruleta-live.html?sorteo=${sorteoIdParam || ''}`);
  location.href = `../login.html?redirect=${redirect}`;
}

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

// Estado
let ruletaInfo = null;
let misNumeros = [];
let microMoveDone = false;

let countdownInterval = null;
let pollingInterval = null;
let refreshMisNumerosInterval = null;
let spinLocked = false; // evita giros dobles cuando ya se mostró el resultado


let rotacionActual = 0;

// --- celebración / anti-repetición ---
const celebrationKey = sorteoId ? `celebrated_ruleta_${sorteoId}` : `celebrated_ruleta_unknown`;
let alreadyCelebrated = sessionStorage.getItem(celebrationKey) === '1';

// --- audio unlock (móviles) ---
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  if (!winSoundEl) {
    audioUnlocked = true;
    return;
  }

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
      audioUnlocked = true;
      winSoundEl.volume = 1;
    });
}

window.addEventListener('click', unlockAudioOnce, { once: true });
window.addEventListener('touchstart', unlockAudioOnce, { once: true });

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

function showWinnerFloat(numeroGanador, nombreGanador) {
  if (!winnerFloat || !winnerFloatNumero || !winnerFloatNombre) return;
  if (!numeroGanador) return;

  winnerFloatNumero.textContent = `N° ${String(numeroGanador).padStart(2, '0')}`; // sin "#"
  winnerFloatNombre.textContent = nombreGanador || 'Ganador';

  winnerFloat.classList.remove('oculto');
  winnerFloat.classList.add('winner-float--show');
}

// ==========================
// Ruleta visual (estética)
// - Muestra SOLO tus números
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

    // label visual (si quieres sin "#", cámbialo aquí)
    slice.innerHTML = mostrarLabel ? `<span class="slice-num">${String(numero).padStart(2, '0')}</span>` : '';

    ruletaCircle.appendChild(slice);
  });



  // mantener rotación actual
  ruletaCircle.style.transform = `rotate(${rotacionActual}deg)`;
}


function spinToWinnerIfPossible(numeroGanador) {
  if (!ruletaCircle) return;
  if (spinLocked) return;


  const num = Number(numeroGanador);
  if (!Number.isFinite(num)) return;

  // La ruleta del participante SOLO tiene misNumeros
  const total = misNumeros.length;
  if (!total) return;

  const idx = misNumeros.findIndex(n => Number(n) === num);
  

  // Si el ganador NO está en misNumeros, no podemos alinear un slice inexistente.
  if (idx < 0) {
    // Igual metemos adrenalina: un mini spin y listo (sin prometer que "cae" en el ganador)
    const vueltas = 3 + Math.floor(Math.random() * 2); // 3–4 vueltas
    const destino = rotacionActual + vueltas * 360 + (40 + Math.random() * 80);
    // transición “premium”
    spinLocked = true;
    ruletaCircle.style.transition = 'transform 2200ms cubic-bezier(.12,.9,.12,1)';
    // forzar reflow para que la transición aplique
    void ruletaCircle.offsetHeight;
    ruletaCircle.style.transform = `rotate(${destino}deg)`;
    rotacionActual = destino;
    return;
  }

  // ✅ Giro determinístico al slice ganador (centro del slice al puntero)
  const anguloSlice = 360 / total;
  const anguloCentro = idx * anguloSlice + anguloSlice / 2;

  // Más adrenalina: más vueltas + micro variación casi imperceptible
  const vueltasExtra = 6 + Math.floor(Math.random() * 3); // 6–8 vueltas
  const jitter = (Math.random() * 2 - 1) * (anguloSlice * 0.08); // ±8% de un slice
  
  spinLocked = true;
  const destino = rotacionActual + vueltasExtra * 360 + (360 - anguloCentro) + jitter;

  // Transición “premium”
  ruletaCircle.style.transition = 'transform 4800ms cubic-bezier(.12,.9,.12,1)';
  void ruletaCircle.offsetHeight;
  ruletaCircle.style.transform = `rotate(${destino}deg)`;
  rotacionActual = destino;

  // Cuando termina, marcamos visualmente el slice ganador (si quieres)
  setTimeout(() => {
    const slices = Array.from(ruletaCircle.querySelectorAll('.ruleta-slice'));
    slices.forEach(el => el.classList.remove('ganador'));
    if (slices[idx]) slices[idx].classList.add('ganador');
  }, 4900);
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

  // Reset ganador flotante si aún no finaliza
  if (winnerFloat) {
    winnerFloat.classList.add('oculto');
    winnerFloat.classList.remove('winner-float--show');
  }

  // Si no está finalizada, ocultamos overlay del número ganador
  if (numeroGanadorOverlay) {
    numeroGanadorOverlay.classList.add('oculto');
  }

  // Títulos
  if (tituloSorteo) {
    tituloSorteo.textContent = descripcion
      ? `🎰 ${descripcion}`
      : 'Sala de ruleta';
  }

  if (subtituloSorteo) {
    subtituloSorteo.textContent = premio
      ? `Premio: ${premio}`
      : 'Resultado oficial y verificado.';
  }

  // Estado visual
  setEstadoBadge(ruleta_estado);

  // Hora programada
  if (horaProgramadaTextoEl) {
    horaProgramadaTextoEl.textContent = ruleta_hora_programada
      ? new Date(ruleta_hora_programada).toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          hour12: false,
        })
      : 'Sin programar';
  }

  // Hint al usuario
  if (ruletaHint) {
    if (ruleta_estado === 'no_programada') {
      ruletaHint.textContent =
        'El sorteo está completo. El admin programará la ruleta pronto.';

    } else if (ruleta_estado === 'programada') {
      ruletaHint.textContent =
        'Quédate aquí: cuando llegue la hora, verás el resultado premium.';

      if (ruletaCircle && !microMoveDone) {
        microMoveDone = true;
        ruletaCircle.style.transition = 'transform 900ms ease';
        ruletaCircle.style.transform = `rotate(${rotacionActual + 25}deg)`;
        rotacionActual += 25;

        setTimeout(() => { microMoveDone = false; }, 4000);
      }

    } else {
      ruletaHint.textContent = 'Resultado oficial registrado.';
    }
  }

  // ==========================
  // FINALIZADA
  // ==========================
  if (ruleta_estado === 'finalizada' && numero_ganador != null) {
    microMoveDone = false;

    const numeroGanadorNum = Number(numero_ganador);
    const nombreCorto = ganador?.nombre
      ? ganador.nombre.split(' ')[0]
      : 'Ganador';

    // 🔥 Mostrar número ganador grande EN la ruleta
    if (numeroGanadorOverlay && numeroGanadorBig) {
      numeroGanadorBig.textContent = String(numeroGanadorNum).padStart(2, '0');
      numeroGanadorOverlay.classList.remove('oculto');
    }

    // Resultado principal
    if (resultadoRuleta) {
      resultadoRuleta.innerHTML =
        `✅ Número ganador: <strong>#${String(numeroGanadorNum).padStart(2, '0')}</strong>` +
        ` — <strong>${nombreCorto}</strong>`;
    }

    // Ganador flotante premium
    showWinnerFloat(numeroGanadorNum, nombreCorto);

    // Resaltar si es tu número
    marcarGanadorEnMisNumeros(numeroGanadorNum);

    //  Giro SOLO una vez (spinLocked lo bloquea)
    if (!spinLocked) {
      spinToWinnerIfPossible(numeroGanadorNum);
    }

    // Celebración SOLO una vez (alreadyCelebrated lo bloquea)
    celebrarGanadorOnce(numeroGanadorNum);

    // Detener timers
    stopCountdown();

    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    if (refreshMisNumerosInterval) {
      clearInterval(refreshMisNumerosInterval);
      refreshMisNumerosInterval = null;
    }

    if (contadorTextoEl) {
      contadorTextoEl.textContent = '00:00:00';
    }

    return;
  }


  // ==========================
  // NO FINALIZADA → countdown
  // ==========================
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

  // 1) mini spin SOLO si NO hicimos giro al ganador
  if (!spinLocked) {
    miniSpin();
  }


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
        winSoundEl.play().catch(() => {});
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
  const extra = Math.floor(Math.random() * 120);
  const destino = rotacionActual + vueltas * 360 + extra;

  ruletaCircle.style.transform = `rotate(${destino}deg)`;
  rotacionActual = destino;

  setTimeout(() => {
    if (!ruletaCircle) return;
    ruletaCircle.style.transition = '';
  }, 1400);
}

function resaltarSliceGanador(numeroGanador) {
  if (!ruletaCircle) return;
  if (!Array.isArray(misNumeros) || !misNumeros.length) return;

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

document.addEventListener('DOMContentLoaded', init);

// ==========================
// Chat integration.
// ==========================


document.addEventListener('DOMContentLoaded', () => {
  if (sorteoId && token) initChat({ sorteoId, token });
});
