// assets/js/admin/ruleta.js

// URL fija al APP-SERVICE en producción

// Se asume que frontend/assets/js/config.js ya fue cargado y definió window.API_URL
const API_URL = (window.API_URL || 'https://app-service-phi.vercel.app').replace(/\/$/, '');

// Endpoint base de API
//Helper para llamadas a API
const API = `${API_URL}/api`;



// ID de sorteo desde la URL: ruleta.html?sorteo=123 o ?sorteoId=123
const params = new URLSearchParams(window.location.search);
const sorteoIdParam = params.get('sorteo') || params.get('sorteoId');
const sorteoId = sorteoIdParam ? parseInt(sorteoIdParam, 10) : null;

// Elementos del DOM
const tituloSorteo = document.getElementById('tituloSorteo');
const subtituloSorteo = document.getElementById('subtituloSorteo');
const ruletaCircle = document.getElementById('ruletaCircle');
const resultadoRuleta = document.getElementById('resultadoRuleta');
const btnGirar = document.getElementById('btnGirar');

// Estado / contador / modo
const estadoTextoEl = document.getElementById('estadoTexto');
const estadoDotEl = document.getElementById('estadoDot');
const horaProgramadaTextoEl = document.getElementById('horaProgramadaTexto');
const contadorTextoEl = document.getElementById('contadorTexto');
const modoSorteoTextoEl = document.getElementById('modoSorteoTexto');

// Stats
const elTotal = document.getElementById('statTotalNumeros');
const elEnJuego = document.getElementById('statParticipantes');
const elProb = document.getElementById('statProbMedia');
const topBuyerInfoEl = document.getElementById('topBuyerInfo');

// Programar ruleta
const btnProgramar = document.getElementById('btnProgramar');
const panelProgramar = document.getElementById('panelProgramar');
const selectPreset = document.getElementById('selectPreset');
const inputFechaCustom = document.getElementById('inputFechaCustom');
const btnConfirmProgramar = document.getElementById('btnConfirmProgramar');

// Estado en memoria
let participantes = [];
let rotacionActual = 0;
let girando = false;

let ruletaInfo = null;
let countdownInterval = null;
let pollingInterval = null;

// Helpers de auth
const token = localStorage.getItem('token');

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!token || user.rol !== 'admin') {
  location.href = '../login.html'; // ajusta la ruta según tu estructura
}
// ==========================
// 1) Validar y early checks
// ==========================
if (!sorteoId) {
  if (tituloSorteo) tituloSorteo.textContent = 'Sorteo no especificado';
  if (subtituloSorteo) {
    subtituloSorteo.textContent =
      'Vuelve al panel y entra desde el botón de ruleta.';
  }
  if (btnGirar) btnGirar.disabled = true;
}


// ==========================
// 2) Construir ruleta visual
// ==========================

function construirRuleta(participants) {
  if (!ruletaCircle) return;

  ruletaCircle.innerHTML = '';

  const total = participants.length;
  if (total === 0) return;

  const anguloSlice = 360 / total;

  const maxLabels = 22;
  const pasoLabel = total <= maxLabels ? 1 : Math.ceil(total / maxLabels);

  participants.forEach((p, index) => {
    const slice = document.createElement('div');
    slice.className = 'ruleta-slice';

    const anguloInicio = index * anguloSlice;

    slice.style.transform =
      `rotate(${anguloInicio}deg) skewY(${90 - anguloSlice}deg)`;

    let fontSizeRem = 0.75;
    if (total > 40 && total <= 80) fontSizeRem = 0.6;
    else if (total > 80 && total <= 160) fontSizeRem = 0.5;
    else if (total > 160) fontSizeRem = 0.45;

    slice.style.fontSize = `${fontSizeRem}rem`;

    const mostrarLabel = index % pasoLabel === 0;

    slice.innerHTML = mostrarLabel
      ? `<span class="slice-num">${p.numero}</span>`
      : '';

    ruletaCircle.appendChild(slice);
  });
}

// ==========================
// 3) Llamadas a backend
// ==========================

const WINNER_CACHE_KEY = sorteoId ? `ruleta_admin_ganador_${sorteoId}` : null;

function cacheWinnerIfFinal(data) {
  if (!WINNER_CACHE_KEY) return;

  if (data?.ruleta_estado === 'finalizada' && (data?.numero_ganador || data?.ganador)) {
    localStorage.setItem(
      WINNER_CACHE_KEY,
      JSON.stringify({
        numero_ganador: data.numero_ganador ?? null,
        ganador: data.ganador ?? null,
      })
    );
  }
}

function applyWinnerFromCache(data) {
  if (!WINNER_CACHE_KEY) return data;
  const cached = localStorage.getItem(WINNER_CACHE_KEY);
  if (!cached) return data;

  try {
    const parsed = JSON.parse(cached);
    return {
      ...data,
      numero_ganador: data?.numero_ganador ?? parsed.numero_ganador,
      ganador: data?.ganador ?? parsed.ganador,
      ruleta_estado: data?.ruleta_estado ?? (parsed.numero_ganador ? 'finalizada' : data?.ruleta_estado),
    };
  } catch {
    return data;
  }
}

function resaltarSliceGanador(numeroGanador) {
  if (!ruletaCircle || !numeroGanador) return;

  const slices = Array.from(ruletaCircle.querySelectorAll('.ruleta-slice'));
  slices.forEach(s => s.classList.remove('ganador'));

  const idx = participantes.findIndex(p => p.numero === numeroGanador);
  if (idx >= 0 && slices[idx]) slices[idx].classList.add('ganador');
}


async function fetchRuletaInfo() {
  if (!sorteoId) return;

  try {
    const res = await fetch(`${API}/sorteos/${sorteoId}/ruleta-info`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const dataRaw = await res.json();

    if (!res.ok) {
      console.error('Error ruleta-info:', dataRaw);
      return;
    }

    // ✅ completa con cache si backend a veces no manda ganador
    const data = applyWinnerFromCache(dataRaw);

    // ✅ si ya finalizó, guarda en cache
    cacheWinnerIfFinal(data);

    ruletaInfo = data;
    renderRuletaInfo();
  } catch (err) {
    console.error('Error fetchRuletaInfo:', err);
  }
}


async function fetchRuletaParticipantes() {
  if (!sorteoId) return;

  try {
    const res = await fetch(`${API}/sorteos/${sorteoId}/ruleta-participantes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error ruleta-participantes:', data);
      return;
    }

    // Normalizamos para conservar nombre_corto que usa la animación
    participantes = (data.participantes || []).map((p) => ({
      ...p,
      nombre_corto: p.nombre ? p.nombre.split(' ')[0] : `Usuario ${p.usuario_id}`,
    }));

    // Stats básicos
    const totalEnJuego = participantes.length;
    if (elEnJuego) elEnJuego.textContent = totalEnJuego;

    if (ruletaInfo && typeof ruletaInfo.cantidad_numeros === 'number') {
      if (elTotal) elTotal.textContent = ruletaInfo.cantidad_numeros;
    }

    if (elProb) {
      elProb.textContent =
        totalEnJuego > 0 ? `Cada número tiene 1 entre ${totalEnJuego}` : '-';
    }

    if (!participantes.length) {
      if (ruletaCircle) {
        ruletaCircle.innerHTML =
          '<p style="text-align:center; padding:1rem;">No hay participantes aprobados todavía.</p>';
      }
      if (btnGirar) btnGirar.disabled = true;
      return;
    }

    // ✅ 1) Construir la ruleta primero (crea los slices)
    construirRuleta(participantes);

    // ✅ 2) Si ya está finalizada, ahora sí resaltar el slice ganador
    if (ruletaInfo?.ruleta_estado === 'finalizada' && ruletaInfo?.numero_ganador) {
      resaltarSliceGanador(ruletaInfo.numero_ganador);
    }

    // Botón girar según si ya se puede
    if (btnGirar && ruletaInfo) {
      btnGirar.disabled = !puedeGirarAhora();
    }
  } catch (err) {
    console.error('Error fetchRuletaParticipantes:', err);
  }
}


// ==========================
// 4) Render estado / contador
// ==========================

function puedeGirarAhora() {
  if (!ruletaInfo) return false;
  if (ruletaInfo.ruleta_estado !== 'programada') return false;
  if (!ruletaInfo.ruleta_hora_programada) return false;

  const now = new Date();
  const prog = new Date(ruletaInfo.ruleta_hora_programada);
  return now >= prog;
}

function renderRuletaInfo() {
  if (!ruletaInfo) return;

  const {
    descripcion,
    premio,
    ruleta_estado,
    ruleta_hora_programada,
    modo_sorteo,
    ganador,
    numero_ganador,
    topBuyer,
    cantidad_numeros,
  } = ruletaInfo;

  // Estado (texto + punto)
  if (estadoTextoEl && estadoDotEl) {
    estadoTextoEl.textContent = ruleta_estado;

    estadoDotEl.classList.remove(
      'estado-no_programada',
      'estado-programada',
      'estado-finalizada'
    );

    if (ruleta_estado === 'programada') {
      estadoDotEl.classList.add('estado-programada');
    } else if (ruleta_estado === 'finalizada') {
      estadoDotEl.classList.add('estado-finalizada');
    } else {
      estadoDotEl.classList.add('estado-no_programada');
    }
  }

  // Hora programada
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

  // Botón girar según si ya se puede
  if (btnGirar) btnGirar.disabled = !puedeGirarAhora();

  //  FINALIZADA
  if (ruleta_estado === 'finalizada') {
    // parar polling/contador
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    if (btnGirar) btnGirar.disabled = true;
    if (contadorTextoEl) contadorTextoEl.textContent = '00:00:00';

    //  Pintar resultado final SIEMPRE (aunque recargues)
    if (resultadoRuleta) {
      if (numero_ganador) {
        const nombreCorto = ganador?.nombre ? ganador.nombre.split(' ')[0] : 'Ganador';
        resultadoRuleta.innerHTML =
          `✅ Número ganador: <strong>${numero_ganador}</strong> — <strong>${nombreCorto}</strong>`;
      } else {
        resultadoRuleta.innerHTML = `✅ Ruleta finalizada.`;
      }
    }

    // ✅ GANADOR FLOTANTE (premium)
    const wf = document.getElementById('winnerFloat');
    const wfNum = document.getElementById('winnerFloatNumero');
    const wfName = document.getElementById('winnerFloatNombre');

    if (wf && numero_ganador) {
      wf.classList.remove('oculto');
      wf.classList.add('winner-float--show');

      if (wfNum) wfNum.textContent = `N° ${numero_ganador}`; // sin "#"
      if (wfName) wfName.textContent = ganador?.nombre ? ganador.nombre.split(' ')[0] : 'Ganador';
    }

    //  Asegurar que existan slices antes de resaltar
    if (
      ruletaCircle &&
      !ruletaCircle.querySelector('.ruleta-slice') &&
      Array.isArray(participantes) &&
      participantes.length
    ) {
      construirRuleta(participantes);
    }

    //  Resaltar slice ganador sin volver a girar
    if (numero_ganador) {
      resaltarSliceGanador(numero_ganador);
    }

    return; // no countdown
  }

  // Si no está finalizada, mantenemos el contador activo
  iniciarCountdown();
}




// ==========================
// 5) Contador regresivo
// ==========================
function iniciarCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);

  if (!ruletaInfo || !ruletaInfo.ruleta_hora_programada || !contadorTextoEl) {
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
      if (btnGirar && ruletaInfo.ruleta_estado === 'programada') {
        btnGirar.disabled = false;
      }
      if (overlay) overlay.style.display = 'none';
      clearInterval(countdownInterval);
      countdownInterval = null;
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

    // Overlay gigante solo últimos 10 segundos
    if (totalSeconds <= 10 && overlay && bigEl) {
      overlay.style.display = 'flex';
      bigEl.textContent = totalSeconds;
    } else if (overlay) {
      overlay.style.display = 'none';
    }

    // Mensajes motivacionales cada 5 segundos
    if (motivationalEl && totalSeconds % 5 === 0) {
      const frase = frases[Math.floor(Math.random() * frases.length)];
      motivationalEl.textContent = frase;
    }
  }

  actualizar();
  countdownInterval = setInterval(actualizar, 1000);
}


// ==========================
// 6) Programar ruleta
// ==========================
async function programarRuleta() {
  if (!sorteoId) return;

  const body = {};

  if (selectPreset.value === 'custom') {
    const val = inputFechaCustom.value;
    if (!val) {
      alert('Selecciona una fecha/hora válida');
      return;
    }
    body.fechaPersonalizada = new Date(val).toISOString();
  } else {
    const minutos = parseInt(selectPreset.value, 10);
    if (Number.isNaN(minutos) || minutos <= 0) {
      alert('Valor de minutos inválido');
      return;
    }
    body.tiempoMinutos = minutos;
  }

  try {
    const res = await fetch(
      `${API}/sorteos/${sorteoId}/programar-ruleta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Error programar ruleta:', data);
      alert(data.error || 'Error al programar la ruleta.');
      return;
    }

    alert('Ruleta programada correctamente.');
    await fetchRuletaInfo();
  } catch (err) {
    console.error('Error programarRuleta:', err);
    alert('Error de red al programar ruleta.');
  }
}

// ==========================
// 7) Girar ruleta (animación)
// ==========================
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
  if (resultadoRuleta) {
    resultadoRuleta.textContent = 'Girando ruleta... 🎰✨';
  }

  let res, data;
  try {
    res = await fetch(
      `${API}/sorteos/${sorteoId}/realizar-ruleta`,
      {
        method: 'POST',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      }
    );
    data = await res.json();
  } catch (err) {
    console.error('Error al realizar ruleta:', err);
    if (resultadoRuleta) {
      resultadoRuleta.textContent = 'Error al conectar con el servidor.';
    }
    girando = false;
    if (btnGirar) btnGirar.disabled = false;
    return;
  }

  if (!res.ok) {
    console.error('Error al realizar ruleta:', data);
    if (resultadoRuleta) {
      resultadoRuleta.textContent = data.error || 'Error al realizar ruleta.';
    }
    girando = false;
    if (btnGirar) btnGirar.disabled = false;
    return;
  }

  const numeroGanador =
    data.ganador?.numero || data.sorteo?.numero_ganador || null;

  const idxGanador = participantes.findIndex(
    (p) => p.numero === numeroGanador
  );
  const ganador = idxGanador >= 0 ? participantes[idxGanador] : null;

  if (!ruletaCircle || !numeroGanador) {
    if (resultadoRuleta) {
      resultadoRuleta.innerHTML = ganador
        ? `🎉 Ganador: <strong>${ganador.nombre_corto}</strong> con el número <strong>#${numeroGanador}</strong>.`
        : `🎉 Número ganador: <strong>#${numeroGanador}</strong>.`;
    }
    girando = false;
    return;
  }

  const slices = Array.from(
    ruletaCircle.querySelectorAll('.ruleta-slice')
  );
  const total = participantes.length;
  const anguloSlice = 360 / total;

  const indice = idxGanador >= 0 ? idxGanador : 0;
  const anguloCentro = indice * anguloSlice + anguloSlice / 2;

  const vueltasExtra = 5 + Math.floor(Math.random() * 3); // 5–7 vueltas
  const rotacionDestino =
    rotacionActual + vueltasExtra * 360 + (360 - anguloCentro);

  ruletaCircle.style.transform = `rotate(${rotacionDestino}deg)`;
  rotacionActual = rotacionDestino;

  setTimeout(() => {
    slices.forEach((s) => s.classList.remove('ganador'));
    if (slices[indice]) {
      slices[indice].classList.add('ganador');
    }

    if (resultadoRuleta) {
      resultadoRuleta.classList.add('ganador-texto');
      resultadoRuleta.innerHTML = ganador
        ? `
          🎉 <strong>${ganador.nombre_corto}</strong> es el ganador con el número <strong>#${numeroGanador}</strong>.<br/>
          Llama su nombre, muéstrale el comprobante y celebra el momento: todos vieron la ruleta en pantalla.
        `
        : `
          🎉 Número ganador: <strong>#${numeroGanador}</strong>.<br/>
          Revisa en el panel qué usuario tiene este número y anúncialo en voz alta.
        `;

      setTimeout(() => {
        resultadoRuleta.classList.remove('ganador-texto');
      }, 1400);
    }

    girando = false;
    // No reactivamos el botón: el giro es definitivo.
    // Reforzamos estado final desde backend:
    fetchRuletaInfo();
  }, 4700);
}

// ==========================
// 8) Eventos e inicialización
// ==========================

if (btnGirar) {
  btnGirar.addEventListener('click', girarRuleta);
}

if (btnProgramar) {
  btnProgramar.addEventListener('click', () => {
    if (!panelProgramar) return;
    const visible = panelProgramar.style.display !== 'none';
    panelProgramar.style.display = visible ? 'none' : 'flex';
  });
}

if (selectPreset) {
  selectPreset.addEventListener('change', () => {
    if (!inputFechaCustom) return;
    if (selectPreset.value === 'custom') {
      inputFechaCustom.style.display = 'inline-block';
    } else {
      inputFechaCustom.style.display = 'none';
    }
  });
}

if (btnConfirmProgramar) {
  btnConfirmProgramar.addEventListener('click', programarRuleta);
}

async function init() {
  if (!sorteoId) return;

  // Cargar info de ruleta + participantes una vez
  await fetchRuletaInfo();
  await fetchRuletaParticipantes();

  // Polling suave de ruleta-info cada 3s (sin recargar página, sin "saltos")
  pollingInterval = setInterval(fetchRuletaInfo, 3000);
}

init();
