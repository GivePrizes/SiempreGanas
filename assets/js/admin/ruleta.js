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
const livePremioPanelEl = document.getElementById('livePremioPanel');
const livePremioPanelTitleEl = document.getElementById('livePremioPanelTitle');
const livePremioBadgeEl = document.getElementById('livePremioBadge');
const livePremioActualEl = document.getElementById('livePremioActual');
const livePremioHintEl = document.getElementById('livePremioHint');
const livePremioResumenEl = document.getElementById('livePremioResumen');
const livePremioHistorialEl = document.getElementById('livePremioHistorial');

// Programar sorteo
const btnProgramar = document.getElementById('btnProgramar');
const panelProgramar = document.getElementById('panelProgramar');
const selectPreset = document.getElementById('selectPreset');
const inputFechaCustom = document.getElementById('inputFechaCustom');
const btnConfirmProgramar = document.getElementById('btnConfirmProgramar');
const btnCancelProgramar = document.getElementById('btnCancelProgramar');
const customDateGroup = document.getElementById('customDateGroup');
const programacionLiveHintEl = document.getElementById('programacionLiveHint');

// Estado en memoria
let participantes = [];
let rotacionActual = 0;
let girando = false;

let ruletaInfo = null;
let countdownInterval = null;
let pollingInterval = null;
let autoSpinIniciado = false;
let autoSpinTimer = null;
let spinVisualActivo = false;

const PRE_SPIN_DURATION_MS = 7000;
const FINAL_SPIN_DURATION_MS = 4700;

// Helpers de auth
const token = localStorage.getItem('token');
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numeric);
}

function getLiveMeta() {
  return ruletaInfo?.modalidad === 'live' ? ruletaInfo?.live || null : null;
}

function getCurrentLivePrize() {
  return getLiveMeta()?.premio_actual || null;
}

function getLastLiveHistoryItem() {
  const historial = getLiveMeta()?.historial;
  return Array.isArray(historial) && historial.length ? historial[historial.length - 1] : null;
}

function getLivePrizeLabel(prize) {
  if (!prize) return '';
  const amount = formatMoney(prize.premio_monto ?? prize.monto);
  return amount ? `${prize.premio_nombre || prize.nombre} · ${amount}` : (prize.premio_nombre || prize.nombre || '');
}

function canProgramCurrentRound() {
  if (!ruletaInfo) return false;

  const estadoSorteo = ruletaInfo.estado_sorteo;
  const estadoRuleta = ruletaInfo.ruleta_estado;
  const isLive = ruletaInfo.modalidad === 'live';

  if (estadoSorteo !== 'lleno') return false;
  if (estadoRuleta === 'girando' || estadoRuleta === 'programada') return false;

  if (isLive) {
    return Boolean(getCurrentLivePrize()) && ['no_programada', 'finalizada'].includes(estadoRuleta);
  }

  return estadoRuleta === 'no_programada';
}

function getProgramacionHint() {
  if (!ruletaInfo) {
    return 'La hora real de esta ronda se programa aqui cuando el sorteo ya este lleno.';
  }

  const isLive = ruletaInfo.modalidad === 'live';
  const estadoSorteo = ruletaInfo.estado_sorteo;
  const estadoRuleta = ruletaInfo.ruleta_estado;
  const currentLivePrize = getCurrentLivePrize();

  if (isLive) {
    if (estadoSorteo !== 'lleno') {
      return 'Este Live primero debe llenarse. La fecha y hora real se programa despues, desde este panel.';
    }
    if (!currentLivePrize) {
      return 'Este Live ya no tiene premios pendientes. Puedes cerrar el evento o dejar el chat abierto.';
    }
    if (estadoRuleta === 'programada') {
      return 'La ronda Live ya esta programada. Espera el contador o cambia la programacion cuando cierre.';
    }
    if (estadoRuleta === 'girando') {
      return 'La ronda Live esta girando ahora mismo.';
    }
    return 'Listo: ya puedes programar la fecha y hora real de este premio Live.';
  }

  if (estadoSorteo !== 'lleno') {
    return 'La ruleta solo se puede programar cuando el sorteo ya este lleno.';
  }
  if (estadoRuleta === 'programada') {
    return 'Esta ronda ya esta programada.';
  }
  if (estadoRuleta === 'girando') {
    return 'La ronda esta girando ahora mismo.';
  }
  if (estadoRuleta === 'finalizada') {
    return 'Esta ronda ya finalizo.';
  }
  return 'Ya puedes programar esta ronda.';
}

function syncProgramarControls() {
  if (btnProgramar) {
    btnProgramar.disabled = !canProgramCurrentRound();
  }

  if (programacionLiveHintEl) {
    programacionLiveHintEl.textContent = getProgramacionHint();
  }

  if (panelProgramar && btnProgramar?.disabled) {
    panelProgramar.style.display = 'none';
  }
}

function syncActionButtons() {
  if (!btnGirar) return;

  const liveMeta = getLiveMeta();
  if (liveMeta?.premio_actual) {
    btnGirar.textContent = `🎰 GIRAR ${String(liveMeta.premio_actual.nombre || 'PREMIO').toUpperCase()}`;
  } else {
    btnGirar.textContent = '🎰 INICIAR RONDA';
  }
}

function renderLivePanel() {
  if (!livePremioPanelEl) return;

  const liveMeta = getLiveMeta();
  if (!liveMeta) {
    livePremioPanelEl.hidden = true;
    return;
  }

  livePremioPanelEl.hidden = false;

  const premioActual = liveMeta.premio_actual;
  const entregados = Number(liveMeta.premios_entregados || 0);
  const restantes = Number(liveMeta.premios_restantes || 0);
  const total = Number(liveMeta.total_premios || 0);
  const elegibles = Number(liveMeta.participantes_elegibles || 0);

  if (livePremioPanelTitleEl) {
    livePremioPanelTitleEl.textContent = premioActual
      ? `Premio actual: ${premioActual.nombre}`
      : 'Live listo para cierre';
  }

  if (livePremioBadgeEl) {
    livePremioBadgeEl.textContent = `${restantes} pendientes`;
  }

  if (livePremioResumenEl) {
    livePremioResumenEl.textContent = `${entregados}/${total} entregados · ${elegibles} elegibles`;
  }

  if (livePremioActualEl) {
    if (premioActual) {
      const amount = formatMoney(premioActual.monto);
      livePremioActualEl.innerHTML = `
        <div class="live-prize-current__eyebrow">Siguiente premio</div>
        <div class="live-prize-current__name">${escapeHtml(premioActual.nombre)}</div>
        <div class="live-prize-current__meta">
          <span>#${escapeHtml(premioActual.orden)}</span>
          <span>${escapeHtml((premioActual.tipo || 'otro').toUpperCase())}</span>
          ${amount ? `<span>${escapeHtml(amount)}</span>` : ''}
        </div>
        ${premioActual.descripcion ? `<p>${escapeHtml(premioActual.descripcion)}</p>` : ''}
      `;
    } else {
      livePremioActualEl.innerHTML = `
        <div class="live-prize-current__eyebrow">Live completado</div>
        <div class="live-prize-current__name">No quedan premios pendientes.</div>
        <p>Ya puedes cerrar el evento o dejar solo el chat activo.</p>
      `;
    }
  }

  if (livePremioHintEl) {
    livePremioHintEl.textContent = premioActual
      ? elegibles > 0
        ? 'El giro sacara un ganador nuevo y lo enviara directo a Live cuentas.'
        : 'Ya no quedan participantes elegibles para seguir girando este Live.'
      : 'Todos los premios configurados para este Live ya quedaron registrados.';
  }

  if (livePremioHistorialEl) {
    const historial = Array.isArray(liveMeta.historial) ? [...liveMeta.historial].reverse() : [];
    if (!historial.length) {
      livePremioHistorialEl.innerHTML = '<p class="live-prize-empty">Todavia no se han registrado premios en vivo.</p>';
    } else {
      livePremioHistorialEl.innerHTML = historial
        .map((item) => {
          const amount = formatMoney(item.premio_monto);
          const ganador = item.ganador_alias || item.ganador_nombre || `Usuario ${item.usuario_id}`;
          return `
            <article class="live-prize-item">
              <div class="live-prize-item__top">
                <strong>${escapeHtml(item.premio_nombre)}</strong>
                <span>#${escapeHtml(item.numero)}</span>
              </div>
              <div class="live-prize-item__meta">
                <span>${escapeHtml(ganador)}</span>
                ${amount ? `<span>${escapeHtml(amount)}</span>` : `<span>${escapeHtml((item.premio_tipo || 'otro').toUpperCase())}</span>`}
              </div>
            </article>
          `;
        })
        .join('');
    }
  }
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

function wait(ms) {
  return new Promise((resolve) => {
    autoSpinTimer = setTimeout(resolve, ms);
  });
}

function getGanadorVisual(numeroGanador, ganadorData = null) {
  const numero = Number(numeroGanador);
  const participante =
    participantes.find((p) => Number(p.numero) === numero) || null;
  const nombre = ganadorData?.nombre || participante?.nombre || null;

  return {
    numero,
    nombre,
    nombreCorto: nombre ? nombre.split(' ')[0] : participante?.nombre_corto || 'Ganador',
  };
}

function mostrarBannerGanador(numeroGanador, ganadorData = null) {
  const wf = document.getElementById('winnerFloat');
  const wfNum = document.getElementById('winnerFloatNumero');
  const wfName = document.getElementById('winnerFloatNombre');

  if (!wf || !numeroGanador) return;

  const ganadorVisual = getGanadorVisual(numeroGanador, ganadorData);
  wf.classList.remove('oculto');
  wf.classList.add('winner-float--show');

  if (wfNum) wfNum.textContent = `N° ${ganadorVisual.numero}`;
  if (wfName) wfName.textContent = ganadorVisual.nombreCorto;
}

function mostrarResultadoGanador(numeroGanador, ganadorData = null, { animado = false, livePrize = null } = {}) {
  if (!resultadoRuleta) return;

  if (!numeroGanador) {
    resultadoRuleta.innerHTML = '✅ Ruleta finalizada.';
    return;
  }

  const ganadorVisual = getGanadorVisual(numeroGanador, ganadorData);
  const premioTexto = livePrize ? getLivePrizeLabel(livePrize) : '';

  if (animado) {
    resultadoRuleta.classList.add('ganador-texto');
    resultadoRuleta.innerHTML = ganadorVisual.nombre
      ? `
        🎉 <strong>${ganadorVisual.nombreCorto}</strong> es el ganador con el número <strong>#${ganadorVisual.numero}</strong>.<br/>
        ${premioTexto ? `Premio actual: <strong>${escapeHtml(premioTexto)}</strong>.<br/>` : ''}
        Llama su nombre, muéstrale el comprobante y celebra el momento: todos vieron la ruleta en pantalla.
      `
      : `
        🎉 Número ganador: <strong>#${ganadorVisual.numero}</strong>.<br/>
        ${premioTexto ? `Premio actual: <strong>${escapeHtml(premioTexto)}</strong>.<br/>` : ''}
        Revisa en el panel qué usuario tiene este número y anúncialo en voz alta.
      `;

    setTimeout(() => {
      resultadoRuleta?.classList.remove('ganador-texto');
    }, 1400);
    return;
  }

  resultadoRuleta.innerHTML = ganadorVisual.nombre
    ? `✅ Número ganador: <strong>${ganadorVisual.numero}</strong> — <strong>${ganadorVisual.nombreCorto}</strong>${premioTexto ? ` · <span>${escapeHtml(premioTexto)}</span>` : ''}`
    : `✅ Número ganador: <strong>${ganadorVisual.numero}</strong>${premioTexto ? ` · <span>${escapeHtml(premioTexto)}</span>` : ''}`;
}

function iniciarSpinVisual() {
  if (!ruletaCircle || spinVisualActivo) return;

  spinVisualActivo = true;
  const rotacionDestino = rotacionActual + 10 * 360;
  ruletaCircle.style.transition = `transform ${PRE_SPIN_DURATION_MS}ms linear`;
  ruletaCircle.style.transform = `rotate(${rotacionDestino}deg)`;
  rotacionActual = rotacionDestino;
}

function animarGanador(numeroGanador, ganadorData = null, { livePrize = null } = {}) {
  if (!ruletaCircle || !numeroGanador || !participantes.length) {
    mostrarBannerGanador(numeroGanador, ganadorData);
    mostrarResultadoGanador(numeroGanador, ganadorData, { animado: false, livePrize });
    spinVisualActivo = false;
    girando = false;
    return Promise.resolve();
  }

  const total = participantes.length;
  const anguloSlice = 360 / total;
  const indice = participantes.findIndex((p) => Number(p.numero) === Number(numeroGanador));
  const indiceFinal = indice >= 0 ? indice : 0;
  const anguloCentro = indiceFinal * anguloSlice + anguloSlice / 2;
  const vueltasExtra = 5 + Math.floor(Math.random() * 3);
  const rotacionDestino =
    rotacionActual + vueltasExtra * 360 + (360 - anguloCentro);

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      ruletaCircle.style.transition =
        `transform ${FINAL_SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.89, 0.32, 1.28)`;
      ruletaCircle.style.transform = `rotate(${rotacionDestino}deg)`;
      rotacionActual = rotacionDestino;

      setTimeout(() => {
        resaltarSliceGanador(Number(numeroGanador));
        mostrarBannerGanador(numeroGanador, ganadorData);
        mostrarResultadoGanador(numeroGanador, ganadorData, { animado: true, livePrize });
        spinVisualActivo = false;
        girando = false;
        resolve();
      }, FINAL_SPIN_DURATION_MS);
    });
  });
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
          getLiveMeta()
            ? '<p style="text-align:center; padding:1rem;">No quedan participantes elegibles para el siguiente premio Live.</p>'
            : '<p style="text-align:center; padding:1rem;">No hay participantes aprobados todavía.</p>';
      }
      if (btnGirar) btnGirar.disabled = true;
      syncActionButtons();
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
    syncActionButtons();
  } catch (err) {
    console.error('Error fetchRuletaParticipantes:', err);
  }
}

function startRuletaPolling() {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      await fetchRuletaInfo();
      if (!ruletaInfo || ruletaInfo.ruleta_estado !== 'finalizada') {
        await fetchRuletaParticipantes();
      }
    } catch (err) {
      console.error('Error polling ruleta:', err);
    }
  }, 3000);
}


// ==========================
// 4) Render estado / contador
// ==========================

function puedeGirarAhora() {
  if (!ruletaInfo) return false;
  if (ruletaInfo.modalidad === 'live' && !getCurrentLivePrize()) return false;
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
    modalidad,
    ruleta_estado,
    ruleta_hora_programada,
    modo_sorteo,
    ganador,
    numero_ganador,
    topBuyer,
    cantidad_numeros,
  } = ruletaInfo;
  const currentLivePrize = getCurrentLivePrize();
  const latestLivePrize = getLastLiveHistoryItem();

  syncActionButtons();
  renderLivePanel();
  syncProgramarControls();

  if (tituloSorteo) {
    tituloSorteo.textContent = descripcion || premio || `Ronda #${sorteoId}`;
  }

  if (modoSorteoTextoEl) {
    modoSorteoTextoEl.textContent = modalidad === 'live'
      ? `${modo_sorteo} · LIVE`
      : modo_sorteo;
  }

  if (subtituloSorteo) {
    if (modalidad === 'live' && currentLivePrize) {
      const amount = formatMoney(currentLivePrize.monto);
      subtituloSorteo.textContent = amount
        ? `Premio actual: ${currentLivePrize.nombre} (${amount}). La operacion se crea sola al salir el ganador.`
        : `Premio actual: ${currentLivePrize.nombre}. La operacion se crea sola al salir el ganador.`;
    } else if (modalidad === 'live') {
      subtituloSorteo.textContent = 'Todos los premios Live configurados ya salieron. Puedes cerrar el evento o dejar el chat abierto.';
    } else {
      subtituloSorteo.textContent = 'Control de programación y giro en tiempo real.';
    }
  }

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
  if (btnGirar) {
    btnGirar.disabled = modalidad === 'live' && !currentLivePrize
      ? true
      : !puedeGirarAhora();
  }

  if (ruleta_estado === 'girando') {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    if (btnGirar) btnGirar.disabled = true;
    if (contadorTextoEl) contadorTextoEl.textContent = '00:00:00';
    if (resultadoRuleta) {
      resultadoRuleta.textContent = currentLivePrize
        ? `Girando ${currentLivePrize.nombre}... 🎰✨`
        : 'Girando ruleta... 🎰✨';
    }
    if (!spinVisualActivo) {
      iniciarSpinVisual();
    }
    return;
  }

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
    spinVisualActivo = false;

    mostrarResultadoGanador(numero_ganador, ganador, {
      animado: false,
      livePrize: latestLivePrize,
    });
    mostrarBannerGanador(numero_ganador, ganador);

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
    "Ya casi llega tu momento.",
    "La ronda esta en movimiento...",
    "Preparate, el resultado se acerca...",
    "Sera tu numero el elegido?",
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
      if (ruletaInfo && ruletaInfo.ruleta_estado === 'programada') {
        iniciarRuletaAutomatica();
      }
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

async function ejecutarFlujoRuleta({ pedirConfirmacion = false } = {}) {
  if (girando || autoSpinIniciado || !sorteoId) return;

  if (!participantes.length) {
    alert('No hay participantes aprobados.');
    return;
  }

  if (pedirConfirmacion) {
    const currentLivePrize = getCurrentLivePrize();
    const confirmar = confirm(
      currentLivePrize
        ? `Este giro registrará al ganador de ${currentLivePrize.nombre} y lo enviará a Live cuentas.\n\n¿Deseas continuar?`
        : 'Este giro registrará al ganador de forma definitiva.\n\n¿Deseas continuar?'
    );
    if (!confirmar) return;
  }

  girando = true;
  autoSpinIniciado = true;

  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (btnGirar) btnGirar.disabled = true;
  if (resultadoRuleta) {
    const currentLivePrize = getCurrentLivePrize();
    resultadoRuleta.textContent = currentLivePrize
      ? `Girando ${currentLivePrize.nombre}... 🎰✨`
      : 'Girando ruleta... 🎰✨';
  }
  iniciarSpinVisual();

  try {
    const resStart = await fetch(`${API}/sorteos/${sorteoId}/iniciar-ruleta`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const dataStart = await resStart.json();

    if (!resStart.ok) {
      if (resultadoRuleta) {
        resultadoRuleta.textContent = dataStart?.error || 'Error al iniciar sorteo.';
      }
      girando = false;
      spinVisualActivo = false;
      autoSpinIniciado = false;
      await fetchRuletaInfo();
      startRuletaPolling();
      return;
    }

    if (autoSpinTimer) clearTimeout(autoSpinTimer);
    await wait(PRE_SPIN_DURATION_MS);

    const resFinish = await fetch(`${API}/sorteos/${sorteoId}/spin-finished`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const dataFinish = await resFinish.json();

    if (!resFinish.ok) {
      await fetchRuletaInfo();
      await fetchRuletaParticipantes();

      if (ruletaInfo?.ruleta_estado === 'finalizada' && ruletaInfo?.numero_ganador) {
        await animarGanador(ruletaInfo.numero_ganador, ruletaInfo.ganador, {
          livePrize: getLastLiveHistoryItem(),
        });
        return;
      }

      if (resultadoRuleta) {
        resultadoRuleta.textContent = dataFinish?.error || 'Error al finalizar sorteo.';
      }
      girando = false;
      spinVisualActivo = false;
      autoSpinIniciado = false;
      startRuletaPolling();
      return;
    }

    const numeroGanador =
      dataFinish?.ganador?.numero || dataFinish?.sorteo?.numero_ganador || null;
    const awardedLivePrize = dataFinish?.live_resultado || null;

    await animarGanador(numeroGanador, dataFinish?.ganador || null, {
      livePrize: awardedLivePrize,
    });
    await fetchRuletaInfo();
    await fetchRuletaParticipantes();
  } catch (err) {
    console.error('Error en flujo de ruleta:', err);
    if (resultadoRuleta) {
      resultadoRuleta.textContent = 'Error de red al ejecutar la ruleta.';
    }
    girando = false;
    spinVisualActivo = false;
    autoSpinIniciado = false;
    startRuletaPolling();
  } finally {
    if (autoSpinTimer) {
      clearTimeout(autoSpinTimer);
      autoSpinTimer = null;
    }
  }

  if (topBuyerInfoEl) {
    topBuyerInfoEl.textContent = topBuyer?.alias
      ? `Top buyer actual: ${topBuyer.alias}`
      : '';
  }
}

async function iniciarRuletaAutomatica() {
  await ejecutarFlujoRuleta();
}

// ==========================
// 6) Programar sorteo
// ==========================
async function programarRuleta() {
  if (!sorteoId) return;
  if (!canProgramCurrentRound()) {
    alert(getProgramacionHint());
    return;
  }

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
    if (Number.isNaN(minutos) || minutos < 0) {
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
      alert(data.error || 'Error al programar la ronda.');
      return;
    }

    alert('Ronda programada correctamente.');
    // Ocultar panel de programación
    if (panelProgramar) panelProgramar.style.display = 'none';
    await fetchRuletaInfo();
    await fetchRuletaParticipantes();
    startRuletaPolling();
  } catch (err) {
    console.error('Error programarRuleta:', err);
    alert('Error de red al programar sorteo.');
  }
}

// ==========================
// 7) Girar ruleta (animación)
// ==========================
async function girarRuleta() {
  await ejecutarFlujoRuleta({ pedirConfirmacion: true });
}

// ==========================
// 8) Eventos e inicialización
// ==========================

if (btnGirar) {
  btnGirar.addEventListener('click', girarRuleta);
}

if (btnProgramar) {
  btnProgramar.addEventListener('click', () => {
    if (!panelProgramar || btnProgramar.disabled) return;
    const visible = panelProgramar.style.display !== 'none';
    panelProgramar.style.display = visible ? 'none' : 'flex';
    if (btnConfirmProgramar) btnConfirmProgramar.disabled = false;
  });
}

if (selectPreset) {
  selectPreset.addEventListener('change', () => {
    if (!customDateGroup) return;
    if (selectPreset.value === 'custom') {
      customDateGroup.style.display = 'flex';
    } else {
      customDateGroup.style.display = 'none';
    }
  });
}

if (btnCancelProgramar) {
  btnCancelProgramar.addEventListener('click', () => {
    if (!panelProgramar) return;
    panelProgramar.style.display = 'none';
    selectPreset.value = '10';
    if (customDateGroup) customDateGroup.style.display = 'none';
    if (btnConfirmProgramar) btnConfirmProgramar.disabled = false;
  });
}

if (btnConfirmProgramar) {
  btnConfirmProgramar.addEventListener('click', programarRuleta);
}

syncProgramarControls();

async function init() {
  const user = typeof window.getAuthUser === 'function'
    ? await window.getAuthUser()
    : null;
  if (!token || !user || user.rol !== 'admin') {
    location.href = '../login.html';
    return;
  }

  if (!sorteoId) return;

  // Cargar info de ruleta + participantes una vez
  await fetchRuletaInfo();
  await fetchRuletaParticipantes();

  // Polling suave de ruleta-info cada 3s (sin recargar página, sin "saltos")
  startRuletaPolling();
}

init();






