const apiBase = (window.API_URL || '').replace(/\/$/, '');
const token = localStorage.getItem('token') || '';

if (!token) {
  // si no hay sesión, manda al login
  location.href = '../login.html';
}

const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
});

const btnBack = document.getElementById("btnBack");
if (btnBack) {
  btnBack.addEventListener("click", () => {
    // vuelve a donde venía o al dashboard
    if (document.referrer) history.back();
    else location.href = "dashboard.html";
  });
}

const params = new URLSearchParams(location.search);
const sorteoId = params.get("id") || params.get("sorteo") || params.get("sorteoId");
const btnGoToChat = document.getElementById("btnGoToChat");
if (btnGoToChat) {
  btnGoToChat.addEventListener("click", () => {
    document.getElementById("chatContainer")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

const elSubtitle = document.getElementById("subtitle");
const elEstado = document.getElementById("badgeEstado");
const elCountdown = document.getElementById("countdown");
const audioWin = document.getElementById("audioWin");
const elHint = document.getElementById("countdownHint");
const elBar = document.getElementById("progressBar");
const elOverlay = document.getElementById("overlay");
const elOverlayNum = document.getElementById("overlayNum");
const elResult = document.getElementById("result");
const elChatBody = document.getElementById("chatBody");
const elNumbersList = document.getElementById("numbersList");
const elNumbersCount = document.getElementById("numbersCount");
const chatInputEl = document.getElementById("chatInput");
const chatSendEl = document.getElementById("chatSend");
const chatHintEl = document.getElementById("chatHint");

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let estado = "waiting";
let countdownEndsAtMs = null;
let countdownStartSeconds = null;
let numeroGanador = null;
let ganadorNombre = null;
let pollInFlight = false;

let serverSkewMs = 0;
let audioPrimed = false;
function primeAudioOnce() {
  if (!audioWin || audioPrimed) return;
  audioPrimed = true;

  // Intento de habilitar audio en móviles (requiere gesto del usuario)
  audioWin.volume = 0;
  const p = audioWin.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      audioWin.pause();
      audioWin.currentTime = 0;
      audioWin.volume = 1;
    }).catch(() => {
      audioWin.volume = 1;
    });
  } else {
    audioWin.volume = 1;
  }
}

// Se activa al primer click/toque del usuario
window.addEventListener("pointerdown", primeAudioOnce, { once: true });


let segments = []; // [{numero:1}, ...]
let wheelAngle = 0; // rad
let spinning = false;
let idleSpin = false;
let idleSpinFrame = null;

let did321 = false;
let didSpin = false;
let lastEstado = null;
let lastCountdownSecond = null;
let lastMotivationSecond = null;
const lastSystemKeys = new Set();
const motivationalPhrases = [
  "¡Ya casi llega tu momento!",
  "El sorteo está en movimiento…",
  "Prepárate, el destino se acerca…",
  "¿Será tu número el elegido?",
];

let chatWindowEndsAt = null;
let chatWindowTimer = null;
let pollTimer = null;
let ruletaLiveEndpoint = "live";
let zeroEdgeTriggered = false;

const DEFAULT_POLL_INTERVAL_MS = 2500;
const COUNTDOWN_POLL_INTERVAL_MS = 1000;
const SPINNING_POLL_INTERVAL_MS = 700;
const ZERO_EDGE_POLL_INTERVAL_MS = 180;
const TWO_PI = Math.PI * 2;

function nowServerMs(){
  return Date.now() + (serverSkewMs || 0);
}

function fmtMMSS(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

function setEstadoBadge(txt){
  elEstado.textContent = txt;
}

function safeUpper(s){
  return String(s || "").toUpperCase().replaceAll("_"," ");
}

function normalizeAngle(angle){
  const normalized = angle % TWO_PI;
  return normalized >= 0 ? normalized : normalized + TWO_PI;
}

function mapRuletaEstadoToLive(raw){
  if (raw === "no_programada") return "waiting";
  if (raw === "programada") return "countdown";
  if (raw === "girando") return "spinning";
  if (raw === "finalizada") return "finished";
  if (raw === "en_curso") return "legacy";
  return "waiting";
}

function normalizeLivePayload(data){
  const serverTimeIso = data.server_time || data.serverTime || new Date().toISOString();

  let normalizedEstado = data.estado;
  if (!normalizedEstado) {
    normalizedEstado = mapRuletaEstadoToLive(data.ruleta_estado_raw || data.ruleta_estado);
  }

  if (normalizedEstado === "legacy") {
    normalizedEstado = "waiting";
  }

  let countdownSeconds = Number.isFinite(Number(data.countdown_seconds))
    ? Number(data.countdown_seconds)
    : null;

  if (
    countdownSeconds == null &&
    normalizedEstado === "countdown" &&
    data.ruleta_hora_programada
  ) {
    const diffMs =
      new Date(data.ruleta_hora_programada).getTime() -
      new Date(serverTimeIso).getTime();
    countdownSeconds = Math.max(0, Math.ceil(diffMs / 1000));
  }

  let ganador = data.ganador ?? null;
  if (ganador != null && typeof ganador !== "object") {
    ganador = { numero: ganador, nombre: null, alias: null };
  }

  if (!ganador && data.numero_ganador != null) {
    ganador = {
      numero: data.numero_ganador,
      nombre: data.ganador?.nombre ?? null,
      alias: data.ganador?.alias ?? data.ganador?.nombre ?? null,
    };
  }

  return {
    ...data,
    estado: normalizedEstado || "waiting",
    countdown_seconds: countdownSeconds ?? 0,
    server_time: serverTimeIso,
    ganador,
  };
}

async function fetchRuletaPayload(endpoint){
  const res = await fetch(`${apiBase}/api/sorteos/${sorteoId}/${endpoint}`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    const error = new Error(`No se pudo cargar ${endpoint}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return normalizeLivePayload(data);
}

async function fetchRuletaPayloadWithFallback(){
  const endpoints = ruletaLiveEndpoint === "ruleta-info"
    ? ["ruleta-info"]
    : ["live", "ruleta-info"];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const data = await fetchRuletaPayload(endpoint);
      ruletaLiveEndpoint = endpoint;
      return data;
    } catch (error) {
      lastError = error;

      if (endpoint === "live" && error.status === 404) {
        ruletaLiveEndpoint = "ruleta-info";
        continue;
      }

      break;
    }
  }

  throw lastError || new Error("No se pudo cargar la ruleta en vivo");
}

function getPollIntervalMs(){
  if (estado === "spinning") return SPINNING_POLL_INTERVAL_MS;

  if (countdownEndsAtMs) {
    const diff = countdownEndsAtMs - nowServerMs();
    if (diff <= 0) return ZERO_EDGE_POLL_INTERVAL_MS;
    if (diff <= 6000) return COUNTDOWN_POLL_INTERVAL_MS;
  }

  return DEFAULT_POLL_INTERVAL_MS;
}

function scheduleNextPoll(delayMs = getPollIntervalMs()){
  if (pollTimer) {
    clearTimeout(pollTimer);
  }

  pollTimer = setTimeout(runPollCycle, delayMs);
}

function pushSystemMessage(text, key){
  if (!elChatBody) return;
  const k = key || text;
  if (lastSystemKeys.has(k)) return;
  lastSystemKeys.add(k);

  const row = document.createElement("div");
  row.className = "chat-row system";
  row.innerHTML = `
    <div class="chat-bubble">
      <div class="systemText">${text}</div>
    </div>
  `;
  elChatBody.appendChild(row);
  
  // Auto scroll al final
  if (elChatBody.parentElement) {
    elChatBody.parentElement.scrollTop = elChatBody.parentElement.scrollHeight;
  }
}

function renderNumbersList(){
  if (!elNumbersList) return;

  const nums = Array.isArray(segments) ? segments : [];
  if (!nums.length) {
    elNumbersList.innerHTML = '<span class="muted small">Todavía no hay números aprobados visibles en esta ronda.</span>';
  } else {
  elNumbersList.innerHTML = nums.map(s => {
    const n = Number(s.numero);
    const label = Number.isFinite(n) ? `#${String(n).padStart(2,"0")}` : String(s.numero || '');
    return `<span class="numberChip">${label}</span>`;
  }).join('');
  }

  if (elNumbersCount) {
    elNumbersCount.textContent = String(nums.length || 0);
  }
}

async function fetchMisNumerosParaLista(){
  if (!sorteoId || !token || !elNumbersList) return;

  try{
    const res = await fetch(`${apiBase}/api/participante/mis-numeros?sorteoId=${sorteoId}`, {
      headers: authHeaders()
    });
    const data = await res.json();
    const nums = Array.isArray(data?.numeros) ? data.numeros : [];

    if (!nums.length) {
      elNumbersList.innerHTML = '<span class="muted small">Aún no tienes números aprobados.</span>';
      if (elNumbersCount) elNumbersCount.textContent = '0';
      return;
    }

    nums.sort((a,b) => Number(a) - Number(b));
    elNumbersList.innerHTML = nums.map(n => {
      const label = `#${String(n).padStart(2,"0")}`;
      return `<span class="numberChip">${label}</span>`;
    }).join('');

    if (elNumbersCount) elNumbersCount.textContent = String(nums.length);
  } catch {
    elNumbersList.innerHTML = '<span class="muted small">No se pudieron cargar tus números.</span>';
  }
}

function setChatEnabled(enabled, message){
  if (typeof window.setRuletaLiveChatState === "function") {
    window.setRuletaLiveChatState({ enabled, message });
    return;
  }

  if (chatInputEl) chatInputEl.disabled = !enabled;
  if (chatSendEl) chatSendEl.disabled = !enabled;
  if (chatHintEl && typeof message === "string") chatHintEl.textContent = message;
}

function startChatCountdown(){
  if (chatWindowEndsAt) return;
  chatWindowEndsAt = Date.now() + 5 * 60 * 1000;

  if (chatWindowTimer) clearInterval(chatWindowTimer);
  chatWindowTimer = setInterval(() => {
    if (!chatWindowEndsAt) return;
    const diff = chatWindowEndsAt - Date.now();
    if (diff <= 0) {
      clearInterval(chatWindowTimer);
      chatWindowTimer = null;
      chatWindowEndsAt = null;
      setChatEnabled(false, "Chat cerrado. Gracias por participar.");
      return;
    }

    const total = Math.ceil(diff / 1000);
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    setChatEnabled(true, `Chat activo · se cierra en ${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`);
  }, 1000);
}

// =========================
// DRAW WHEEL (REAL)
// =========================
function getWinnerIndex(){
  if (numeroGanador == null) return -1;
  return segments.findIndex(segment => Number(segment.numero) === Number(numeroGanador));
}

function getWheelStopAngle(winnerNumero){
  if (!segments.length) return null;
  const idx = segments.findIndex(segment => Number(segment.numero) === Number(winnerNumero));
  if (idx < 0) return null;

  const slice = TWO_PI / segments.length;
  const targetAngle = idx * slice + slice / 2;
  const pointerAngle = -Math.PI / 2;
  return normalizeAngle(pointerAngle - targetAngle);
}

function setWheelToWinner(winnerNumero){
  const finalAngle = getWheelStopAngle(winnerNumero);
  if (finalAngle == null) return false;

  wheelAngle = finalAngle;
  drawWheel();
  return true;
}

function getLabelStep(totalSegments){
  if (totalSegments <= 40) return 1;
  if (totalSegments <= 80) return 2;
  if (totalSegments <= 160) return 4;
  if (totalSegments <= 320) return 8;
  return Math.max(10, Math.ceil(totalSegments / 48));
}

function getLabelFontSize(totalSegments){
  if (totalSegments <= 36) return 22;
  if (totalSegments <= 72) return 16;
  if (totalSegments <= 140) return 11;
  if (totalSegments <= 260) return 9;
  return 0;
}

function drawWheel(){
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const radius = Math.min(cx, cy) - 14;
  const winnerIndex = getWinnerIndex();

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelAngle);

  const n = Math.max(1, segments.length);
  const slice = TWO_PI / n;
  const labelStep = getLabelStep(n);
  const labelFontSize = getLabelFontSize(n);
  const baseStrokeWidth = n > 320 ? 0.45 : n > 180 ? 0.75 : n > 96 ? 1.1 : 2;

  for(let i=0;i<n;i++){
    const a0 = i * slice;
    const a1 = a0 + slice;
    const isWinner = i === winnerIndex;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,radius,a0,a1);
    ctx.closePath();

    ctx.fillStyle = isWinner
      ? "rgba(250,204,21,.92)"
      : (i % 2 === 0)
        ? "rgba(250,204,21,.18)"
        : "rgba(255,255,255,.08)";
    ctx.fill();

    ctx.strokeStyle = isWinner
      ? "rgba(255,255,255,.94)"
      : "rgba(255,255,255,.12)";
    ctx.lineWidth = isWinner ? Math.max(1.8, baseStrokeWidth + 1.3) : baseStrokeWidth;
    ctx.stroke();

    if (labelFontSize > 0 && (isWinner || i % labelStep === 0)) {
      const numero = segments[i]?.numero ?? (i+1);
      const label = `#${String(numero).padStart(2,"0")}`;

      ctx.save();
      ctx.rotate(a0 + slice/2);
      ctx.translate(radius * (n > 140 ? 0.84 : 0.72), 0);
      ctx.rotate(Math.PI/2);

      ctx.fillStyle = isWinner ? "rgba(20,18,10,.96)" : "rgba(255,255,255,.92)";
      ctx.font = `900 ${labelFontSize}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);

      ctx.restore();
    }
  }

  // ring
  ctx.rotate(-wheelAngle);
  ctx.beginPath();
  ctx.arc(0,0,radius+6,0,TWO_PI);
  ctx.strokeStyle = "rgba(250,204,21,.95)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // center
  ctx.beginPath();
  ctx.arc(0,0,46,0,TWO_PI);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 16px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MATHO", 0, -10);
  ctx.fillText("ME", 0, 12);

  ctx.restore();
}

async function show321(){
  elOverlay.classList.remove("hidden");
  for(const n of [3,2,1]){
    elOverlayNum.textContent = String(n);
    await new Promise(r => setTimeout(r, 850));
  }
  elOverlay.classList.add("hidden");
}

function showResult(ganadorNombre){
  elResult.classList.remove("hidden");
  const num = `#${String(numeroGanador).padStart(2,"0")}`;
  elResult.textContent = ganadorNombre
    ? `✅ Resultado oficial: ${num} — ${ganadorNombre}`
    : `✅ Resultado oficial: ${num}`;

  if (ganadorNombre) {
    pushSystemMessage(`🎉 Felicitaciones a ${ganadorNombre}`, `win_${ganadorNombre}`);
  } else if (numeroGanador != null) {
    pushSystemMessage(`🏆 ¡Resultado destacado confirmado! Número ${num}`, `win_num_${numeroGanador}`);
  }

  if (audioWin) {
    audioWin.currentTime = 0;
    audioWin.volume = 1;
    audioWin.play().catch(() => {});
  }
}
// =========================
// SPINNING LOGIC
// =========================

function startIdleSpin(){
  if (idleSpin) return;
  idleSpin = true;
  const speed = 0.008;
  const loop = () => {
    if (!idleSpin) return;
    wheelAngle += speed;
    drawWheel();
    idleSpinFrame = requestAnimationFrame(loop);
  };
  idleSpinFrame = requestAnimationFrame(loop);
}

function stopIdleSpin(){
  idleSpin = false;
  if (idleSpinFrame) cancelAnimationFrame(idleSpinFrame);
  idleSpinFrame = null;
}

// Gira hasta el ganador (sin inventarlo)
function spinToWinner(winnerNumero){
  if (spinning || !segments.length) return Promise.resolve(false);
  const finalStopAngle = getWheelStopAngle(winnerNumero);
  if (finalStopAngle == null) return Promise.resolve(false);

  const start = wheelAngle;
  let delta = finalStopAngle - normalizeAngle(start);
  if (delta < 0) delta += TWO_PI;

  const extraTurns = 6 + Math.floor(Math.random() * 3);
  delta += extraTurns * TWO_PI;

  const final = start + delta;
  const duration = segments.length >= 320
    ? 6800
    : segments.length >= 180
      ? 6200
      : 5200;
  const t0 = performance.now();
  spinning = true;

  function easeOutQuint(t){ return 1 - Math.pow(1 - t, 5); }

  return new Promise((resolve) => {
    function frame(t){
      const p = Math.min(1, (t - t0) / duration);
      wheelAngle = start + delta * easeOutQuint(p);
      drawWheel();
      if(p < 1) requestAnimationFrame(frame);
      else{
        spinning = false;
        wheelAngle = normalizeAngle(final);
        drawWheel();
        resolve(true);
      }
    }

    requestAnimationFrame(frame);
  });
}

// =========================
// FETCH LIVE STATE
// =========================
async function fetchRuletaInfo(){
  const data = await fetchRuletaPayloadWithFallback();

  if (data.server_time) {
    serverSkewMs = new Date(data.server_time).getTime() - Date.now();
  }

  estado = data.estado || "waiting";

  if (estado === "countdown" && typeof data.countdown_seconds === "number") {
    const serverMs = data.server_time ? new Date(data.server_time).getTime() : Date.now();
    countdownEndsAtMs = serverMs + data.countdown_seconds * 1000;
    zeroEdgeTriggered = data.countdown_seconds <= 0;

    if (countdownStartSeconds == null || data.countdown_seconds > countdownStartSeconds) {
      countdownStartSeconds = data.countdown_seconds;
    }
  } else {
    countdownEndsAtMs = null;
    countdownStartSeconds = null;
    lastCountdownSecond = null;
    zeroEdgeTriggered = false;
  }

  if (estado === "finished") {
    const ganador = data.ganador ?? null;
    if (ganador && typeof ganador === "object") {
      numeroGanador = ganador.numero ?? ganador.numero_ganador ?? null;
      ganadorNombre = ganador.alias ?? ganador.nombre ?? null;
    } else if (ganador != null) {
      numeroGanador = ganador;
      ganadorNombre = null;
    }
  } else {
    numeroGanador = null;
    ganadorNombre = null;
  }

  setEstadoBadge(safeUpper(estado));

  elSubtitle.textContent =
    estado === "waiting" ? "La ruleta se activará cuando el sorteo se llene y el admin la programe." :
    estado === "countdown" ? "El sorteo ya se llenó. El admin activó la ruleta y la cuenta regresiva está en marcha." :
    estado === "spinning" ? "🎯 La ruleta está girando…" :
    estado === "finished" ? "🏆 Resultado oficial confirmado." :
    "Actualizando…";

  if (lastEstado !== estado) {
    if (estado === "waiting") {
      pushSystemMessage("⏳ La ruleta aún no se activa: primero debe llenarse el sorteo y luego el admin la programará.", "estado_waiting");
      setChatEnabled(false, "La ruleta se habilita cuando el sorteo se llena y el admin la activa.");
    }
    if (estado === "countdown") {
      pushSystemMessage("✅ El sorteo ya está lleno. El admin activó la ruleta y ya empezó la cuenta regresiva.", "estado_countdown");
      setChatEnabled(true, "Chat activo · el sorteo ya está lleno y la ruleta fue programada.");
    }
    if (estado === "spinning") {
      pushSystemMessage("🎯 ¡La ruleta está girando!", "estado_spinning");
      setChatEnabled(true, "Chat activo · el cierre se anuncia al terminar.");
    }
    if (estado === "finished") {
      pushSystemMessage("🏆 ¡Resultado confirmado!", "estado_finished");
      startChatCountdown();
    }
    lastEstado = estado;
  }

  if (estado === "spinning") startIdleSpin();
  else if (!(estado === "countdown" && zeroEdgeTriggered)) stopIdleSpin();

  if (estado !== "finished") {
    elResult.classList.add("hidden");
  }

  return data;
}


async function fetchNumerosRuleta({ force = false } = {}){
  if (!force && segments.length) return segments;
  const res = await fetch(`${apiBase}/api/sorteos/${sorteoId}/ruleta-numeros`, {
    headers: authHeaders()
  });
  if(!res.ok) throw new Error("No se pudo cargar ruleta-numeros");
  const data = await res.json();

  const nums = Array.isArray(data.numeros) ? data.numeros : [];
  const nextSegments = nums
    .map(n => ({ numero: Number(n) }))
    .sort((a,b)=>a.numero-b.numero);

  const changed =
    nextSegments.length !== segments.length ||
    nextSegments.some((segment, index) => segment.numero !== segments[index]?.numero);

  if (changed) {
    segments = nextSegments;
    drawWheel();
  }

  return segments;
}

async function ensureWinnerSegmentLoaded(){
  if (numeroGanador == null) return;
  const exists = segments.some(segment => Number(segment.numero) === Number(numeroGanador));
  if (!exists) {
    await fetchNumerosRuleta({ force: true });
  }
}

// =========================
// COUNTDOWN LOOP
// =========================
function tick(){
  if(estado !== "countdown" || !countdownEndsAtMs){
    elCountdown.textContent = "--:--";
    elHint.textContent = estado === "spinning"
      ? "🎯 La ruleta está girando…"
      : estado === "finished"
        ? "🏆 Ya tenemos ganador"
        : "La ruleta todavía no está activa. Sigue aquí viendo cómo se llenan los números comprados.";
    elBar.style.width = "0%";
    requestAnimationFrame(tick);
    return;
  }

  const diff = countdownEndsAtMs - nowServerMs();

  if(diff > 0){
    zeroEdgeTriggered = false;
    elCountdown.textContent = fmtMMSS(diff);
    const secondsLeft = Math.ceil(diff / 1000);
    elHint.textContent = `⏳ La ruleta comienza en ${secondsLeft} segundos`;

    if (secondsLeft <= 5 && secondsLeft > 0 && lastCountdownSecond !== secondsLeft) {
      pushSystemMessage(`🔥 ${secondsLeft}…`, `count_${secondsLeft}`);
      lastCountdownSecond = secondsLeft;
    }

    // Sin mensajes motivacionales durante countdown

    if (countdownStartSeconds) {
      const totalMs = countdownStartSeconds * 1000;
      const pct = Math.max(0, Math.min(100, 100 - (diff / totalMs) * 100));
      elBar.style.width = `${pct}%`;
    } else {
      elBar.style.width = "0%";
    }

    // 3-2-1 en los últimos 3.2s (solo una vez)
    if(diff <= 3200 && !did321){
      did321 = true;
      show321();
    }

  } else {
    startIdleSpin();
    if (!zeroEdgeTriggered) {
      zeroEdgeTriggered = true;
      scheduleNextPoll(ZERO_EDGE_POLL_INTERVAL_MS);
    }
    elCountdown.textContent = "00:00";
    elHint.textContent = "🎯 La ruleta está girando…";
    elBar.style.width = "100%";
  }

  requestAnimationFrame(tick);
}

async function runPollCycle(){
  if (pollInFlight) {
    scheduleNextPoll(220);
    return;
  }

  pollInFlight = true;

  try{
    const prevGanador = numeroGanador;

    await fetchRuletaInfo();

    if (estado !== "finished") {
      await fetchNumerosRuleta({ force: true });
    } else {
      await ensureWinnerSegmentLoaded();
    }

    if (!didSpin && estado === "finished" && numeroGanador) {
      if (!did321) { did321 = true; await show321(); }
      didSpin = true;
      stopIdleSpin();
      const animated = await spinToWinner(numeroGanador);
      if (!animated) {
        setWheelToWinner(numeroGanador);
      }
      showResult(ganadorNombre);
    }

    if (prevGanador && numeroGanador && prevGanador !== numeroGanador && !spinning) {
      didSpin = true;
      stopIdleSpin();
      await ensureWinnerSegmentLoaded();
      const animated = await spinToWinner(numeroGanador);
      if (!animated) {
        setWheelToWinner(numeroGanador);
      }
      showResult(ganadorNombre);
    }

  } catch(_e){
    // silencioso
  } finally {
    pollInFlight = false;
    scheduleNextPoll();
  }
}

// =========================
// INIT
// =========================
(async function init(){
  if(!sorteoId){
    elSubtitle.textContent = "Falta sorteoId en la URL. Usa ?sorteo=123";
    return;
  }

  try{
    const tryInitChat = () => {
      if (typeof window.initRuletaLiveChat === "function") {
        window.initRuletaLiveChat({ sorteoId, token });
        setChatEnabled(false, "El chat se habilita cuando comience el giro.");
      } else {
        setTimeout(tryInitChat, 0);
      }
    };
    tryInitChat();

    // 1) Info base
    await fetchRuletaInfo();

    // 2) Si no llegó snapshot, dibujar con números aprobados
    await fetchNumerosRuleta({ force: true });

    // 2b) Mis números para el panel lateral
    await fetchMisNumerosParaLista();

    if (estado === "finished" && numeroGanador) {
      await ensureWinnerSegmentLoaded();
      setWheelToWinner(numeroGanador);
      showResult(ganadorNombre);
      didSpin = true;
    }

    // 3) empezar contador
    tick();

    // 4) polling
    scheduleNextPoll();

  }catch(err){
    elSubtitle.textContent = "No se pudo conectar con la ronda en vivo.";
  }
})();







