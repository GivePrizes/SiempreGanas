const apiBase = (window.API_URL || '').replace(/\/$/, '');
let token = localStorage.getItem('token') || '';

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
const focusTarget = params.get("focus") || (location.hash === "#chatContainer" ? "chat" : "");
const liveEntryReason = sessionStorage.getItem("ruletaLiveEntryReason") || "";
if (liveEntryReason) {
  sessionStorage.removeItem("ruletaLiveEntryReason");
}
const btnBuyAnother = document.getElementById("btnBuyAnother");
function scrollToChat({ behavior = "smooth" } = {}) {
  document.getElementById("chatContainer")?.scrollIntoView({
    behavior,
    block: "start"
  });
}

if (btnBuyAnother) {
  btnBuyAnother.addEventListener("click", () => {
    if (!sorteoId) return;
    const nextUrl = new URL("sorteo.html", location.href);
    nextUrl.searchParams.set("id", sorteoId);
    nextUrl.searchParams.set("comprar", "1");
    location.href = nextUrl.toString();
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

if (focusTarget === "chat") {
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      scrollToChat({ behavior: "smooth" });
      if (chatHintEl && liveEntryReason === "approved_participant_redirect") {
        chatHintEl.textContent = "Ya tienes una participación aprobada. Esta es tu sala en vivo. Si quieres otra, usa Comprar otro.";
      }
    }, 220);
  }, { once: true });
}

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let estado = "waiting";
let countdownEndsAtMs = null;
let countdownStartSeconds = null;
let numeroGanador = null;
let ganadorNombre = null;
let ganadorUsuarioId = null;
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


let segments = []; // [{ numero, usuario_id, label, nombre, alias }, ...]
let wheelAngle = 0; // rad
let spinning = false;
let idleSpin = false;
let idleSpinFrame = null;

let did321 = false;
let didSpin = false;
let lastEstado = null;
let lastCountdownSecond = null;
const lastSystemKeys = new Set();

let chatWindowEndsAt = null;
let chatWindowTimer = null;
let pollTimer = null;
let ruletaLiveEndpoint = "live";
let zeroEdgeTriggered = false;
let livePollErrorCount = 0;
let lastNumbersFetchAtMs = 0;

const WAITING_POLL_VISIBLE_MS = 15000;
const WAITING_POLL_HIDDEN_MS = 45000;
const DEFAULT_POLL_VISIBLE_MS = 7000;
const DEFAULT_POLL_HIDDEN_MS = 20000;
const COUNTDOWN_POLL_VISIBLE_MS = 2000;
const COUNTDOWN_POLL_HIDDEN_MS = 6000;
const SPINNING_POLL_VISIBLE_MS = 1800;
const SPINNING_POLL_HIDDEN_MS = 7000;
const ZERO_EDGE_POLL_VISIBLE_MS = 450;
const ZERO_EDGE_POLL_HIDDEN_MS = 1800;
const NUMBERS_REFRESH_WAITING_VISIBLE_MS = 20000;
const NUMBERS_REFRESH_WAITING_HIDDEN_MS = 60000;
const NUMBERS_REFRESH_ACTIVE_VISIBLE_MS = 45000;
const NUMBERS_REFRESH_ACTIVE_HIDDEN_MS = 90000;
const LIVE_POLL_MAX_BACKOFF_MS = 30000;
const TWO_PI = Math.PI * 2;

function nowServerMs(){
  return Date.now() + (serverSkewMs || 0);
}

function isDocumentVisible(){
  return document.visibilityState === "visible";
}

function fmtMMSS(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

function formatMoney(value){
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0";
  return `$${amount.toLocaleString("es-CO")}`;
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

      if (endpoint === "live" && (error.status === 404 || error.status >= 500)) {
        ruletaLiveEndpoint = "ruleta-info";
        continue;
      }

      break;
    }
  }

  throw lastError || new Error("No se pudo cargar la ruleta en vivo");
}

function getPollIntervalMs(){
  const visible = isDocumentVisible();
  if (estado === "waiting") return visible ? WAITING_POLL_VISIBLE_MS : WAITING_POLL_HIDDEN_MS;
  if (estado === "spinning") return visible ? SPINNING_POLL_VISIBLE_MS : SPINNING_POLL_HIDDEN_MS;

  if (countdownEndsAtMs) {
    const diff = countdownEndsAtMs - nowServerMs();
    if (diff <= 0) return visible ? ZERO_EDGE_POLL_VISIBLE_MS : ZERO_EDGE_POLL_HIDDEN_MS;
    if (diff <= 6000) return visible ? COUNTDOWN_POLL_VISIBLE_MS : COUNTDOWN_POLL_HIDDEN_MS;
  }

  return visible ? DEFAULT_POLL_VISIBLE_MS : DEFAULT_POLL_HIDDEN_MS;
}

function getLivePollDelayMs(){
  const baseDelay = getPollIntervalMs();

  if (livePollErrorCount <= 0) {
    return baseDelay;
  }

  const multiplier = Math.min(2 ** Math.min(livePollErrorCount - 1, 2), 4);
  return Math.min(Math.max(baseDelay, 5000) * multiplier, LIVE_POLL_MAX_BACKOFF_MS);
}

function getPollJitterMs(baseDelay){
  if (baseDelay >= 15000) return Math.floor(Math.random() * 1400);
  if (baseDelay >= 7000) return Math.floor(Math.random() * 800);
  if (baseDelay >= 2000) return Math.floor(Math.random() * 220);
  if (baseDelay >= 800) return Math.floor(Math.random() * 120);
  return Math.floor(Math.random() * 60);
}

function getNumbersRefreshIntervalMs(){
  const visible = isDocumentVisible();
  if (estado === "waiting") {
    return visible
      ? NUMBERS_REFRESH_WAITING_VISIBLE_MS
      : NUMBERS_REFRESH_WAITING_HIDDEN_MS;
  }

  return visible
    ? NUMBERS_REFRESH_ACTIVE_VISIBLE_MS
    : NUMBERS_REFRESH_ACTIVE_HIDDEN_MS;
}

function scheduleNextPoll(delayMs = getLivePollDelayMs()){
  if (pollTimer) {
    clearTimeout(pollTimer);
  }

  const safeDelay = Math.max(250, Number(delayMs) || getLivePollDelayMs());
  pollTimer = setTimeout(runPollCycle, safeDelay + getPollJitterMs(safeDelay));
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

function getSegmentDisplayLabel(segment, index = 0){
  const rawLabel = String(
    segment?.label ||
    segment?.alias ||
    segment?.nombre ||
    ''
  ).trim();

  if (rawLabel) {
    return rawLabel.length > 14 ? `${rawLabel.slice(0, 13)}…` : rawLabel;
  }

  return `P${index + 1}`;
}

function segmentMatchesWinner(segment, { winnerNumero = numeroGanador, winnerUserId = ganadorUsuarioId } = {}){
  if (winnerUserId != null && segment?.usuario_id != null) {
    return Number(segment.usuario_id) === Number(winnerUserId);
  }

  if (winnerNumero == null) return false;
  return Number(segment?.numero) === Number(winnerNumero);
}

async function fetchMisNumerosParaLista(){
  if (!sorteoId || !token || !elNumbersList) {
    return { numeros: [], canWrite: false };
  }

  try{
    const res = await fetch(`${apiBase}/api/participante/mis-numeros?sorteoId=${sorteoId}`, {
      headers: authHeaders()
    });
    const data = await res.json();
    const nums = Array.isArray(data?.numeros) ? data.numeros : [];

    if (!nums.length) {
      elNumbersList.innerHTML = '<span class="muted small">Aún no tienes participaciones aprobadas.</span>';
      if (elNumbersCount) elNumbersCount.textContent = '0';
      return {
        numeros: [],
        canWrite: false,
        message: 'Solo participantes aprobados pueden escribir.',
      };
    }

    nums.sort((a,b) => Number(a) - Number(b));
    elNumbersList.innerHTML = nums.map((_, index) => {
      const label = `Participación ${index + 1}`;
      return `<span class="numberChip">${label}</span>`;
    }).join('');

    if (elNumbersCount) elNumbersCount.textContent = String(nums.length);
    return {
      numeros: nums,
      canWrite: true,
      message: '',
    };
  } catch {
    elNumbersList.innerHTML = '<span class="muted small">No se pudieron cargar tus participaciones.</span>';
    return {
      numeros: [],
      canWrite: false,
      message: 'No se pudo validar tu acceso al chat.',
    };
  }
}

function waitForLiveChatBridge({
  retries = 24,
  delayMs = 180,
} = {}) {
  return new Promise((resolve) => {
    const attempt = (remaining) => {
      if (typeof window.initRuletaLiveChat === "function") {
        resolve(true);
        return;
      }

      if (remaining <= 0) {
        resolve(false);
        return;
      }

      setTimeout(() => attempt(remaining - 1), delayMs);
    };

    attempt(retries);
  });
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

function syncChatPhaseState(currentEstado = estado){
  if (currentEstado === "finished") {
    startChatCountdown();
    return;
  }

  if (currentEstado === "countdown") {
    setChatEnabled(true, "Chat activo · la ronda ya fue programada y sigue abierta.");
    return;
  }

  if (currentEstado === "spinning") {
    setChatEnabled(true, "Chat activo · sigue la conversación en vivo.");
    return;
  }

  setChatEnabled(true, "Chat activo · solo participantes aprobados pueden escribir.");
}

function resetRoundCycleState(){
  did321 = false;
  didSpin = false;
  numeroGanador = null;
  ganadorNombre = null;
  ganadorUsuarioId = null;

  if (elResult) {
    elResult.classList.add("hidden");
    elResult.textContent = "";
  }

  if (chatWindowTimer) {
    clearInterval(chatWindowTimer);
    chatWindowTimer = null;
  }

  chatWindowEndsAt = null;
  stopIdleSpin();

  [
    "estado_waiting",
    "estado_countdown",
    "estado_spinning",
    "estado_finished",
  ].forEach((key) => lastSystemKeys.delete(key));
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
  if (numeroGanador == null && ganadorUsuarioId == null) return -1;
  return segments.findIndex((segment) => segmentMatchesWinner(segment));
}

function getWheelStopAngle({ winnerNumero = numeroGanador, winnerUserId = ganadorUsuarioId } = {}){
  if (!segments.length) return null;
  const idx = segments.findIndex((segment) =>
    segmentMatchesWinner(segment, { winnerNumero, winnerUserId })
  );
  if (idx < 0) return null;

  const slice = TWO_PI / segments.length;
  const targetAngle = idx * slice + slice / 2;
  const pointerAngle = -Math.PI / 2;
  return normalizeAngle(pointerAngle - targetAngle);
}

function setWheelToWinner({ winnerNumero = numeroGanador, winnerUserId = ganadorUsuarioId } = {}){
  const finalAngle = getWheelStopAngle({ winnerNumero, winnerUserId });
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
      const label = getSegmentDisplayLabel(segments[i], i);

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
  const winnerSegment = segments.find((segment) => segmentMatchesWinner(segment)) || null;
  const winnerLabel = ganadorNombre || getSegmentDisplayLabel(winnerSegment, 0);
  elResult.textContent = winnerLabel
    ? `✅ Resultado oficial: ${winnerLabel}`
    : "✅ Resultado oficial confirmado.";

  if (winnerLabel) {
    pushSystemMessage(`🎉 Felicitaciones a ${winnerLabel}`, `win_${winnerLabel}`);
  } else if (ganadorUsuarioId != null) {
    pushSystemMessage("🏆 ¡Resultado destacado confirmado!", `win_user_${ganadorUsuarioId}`);
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
function spinToWinner({ winnerNumero = numeroGanador, winnerUserId = ganadorUsuarioId } = {}){
  if (spinning || !segments.length) return Promise.resolve(false);
  const finalStopAngle = getWheelStopAngle({ winnerNumero, winnerUserId });
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
  const previousEstado = lastEstado;

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
      ganadorUsuarioId = ganador.usuario_id ?? null;
    } else if (ganador != null) {
      numeroGanador = ganador;
      ganadorNombre = null;
      ganadorUsuarioId = null;
    }
  } else {
    numeroGanador = null;
    ganadorNombre = null;
    ganadorUsuarioId = null;
  }

  setEstadoBadge(safeUpper(estado));

  if (previousEstado === "finished" && estado !== "finished") {
    resetRoundCycleState();
  }

  elSubtitle.textContent =
    estado === "waiting" ? "La ruleta se activará cuando el sorteo se llene y el admin la programe." :
    estado === "countdown" ? "El sorteo ya se llenó. El admin activó la ruleta y la cuenta regresiva está en marcha." :
    estado === "spinning" ? "🎯 La ruleta está girando…" :
    estado === "finished" ? "🏆 Resultado oficial confirmado." :
    "Actualizando…";

  if (lastEstado !== estado) {
    if (estado === "waiting") {
      pushSystemMessage("⏳ La ruleta aún no se activa: primero debe llenarse el sorteo y luego el admin la programará.", "estado_waiting");
    }
    if (estado === "countdown") {
      pushSystemMessage("✅ El sorteo ya está lleno. El admin activó la ruleta y ya empezó la cuenta regresiva.", "estado_countdown");
    }
    if (estado === "spinning") {
      pushSystemMessage("🎯 ¡La ruleta está girando!", "estado_spinning");
    }
    if (estado === "finished") {
      pushSystemMessage("🏆 ¡Resultado confirmado!", "estado_finished");
    }
    syncChatPhaseState(estado);
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
  const now = Date.now();
  if (
    !force &&
    segments.length &&
    lastNumbersFetchAtMs &&
    now - lastNumbersFetchAtMs < getNumbersRefreshIntervalMs()
  ) {
    return segments;
  }

  const res = await fetch(`${apiBase}/api/sorteos/${sorteoId}/ruleta-numeros`, {
    headers: authHeaders()
  });
  if(!res.ok) throw new Error("No se pudo cargar ruleta-numeros");
  const data = await res.json();

  const participantes = Array.isArray(data.participantes) ? data.participantes : [];
  const nextSegments = (
    participantes.length
      ? participantes
      : (Array.isArray(data.numeros) ? data.numeros.map((numero) => ({ numero })) : [])
  )
    .map((item, index) => {
      if (typeof item === "object" && item !== null) {
        return {
          numero: Number(item.numero),
          usuario_id: item.usuario_id ?? null,
          nombre: item.nombre ?? null,
          alias: item.alias ?? null,
          label: item.label || item.alias || item.nombre || `P${index + 1}`,
        };
      }

      return {
        numero: Number(item),
        usuario_id: null,
        nombre: null,
        alias: null,
        label: `P${index + 1}`,
      };
    })
    .sort((a, b) => {
      const leftUser = Number(a.usuario_id || 0);
      const rightUser = Number(b.usuario_id || 0);
      if (leftUser !== rightUser) return leftUser - rightUser;
      return Number(a.numero || 0) - Number(b.numero || 0);
    });

  const changed =
    nextSegments.length !== segments.length ||
    nextSegments.some((segment, index) =>
      segment.numero !== segments[index]?.numero ||
      Number(segment.usuario_id || 0) !== Number(segments[index]?.usuario_id || 0) ||
      segment.label !== segments[index]?.label
    );

  if (changed) {
    segments = nextSegments;
    drawWheel();
  }

  lastNumbersFetchAtMs = Date.now();
  return segments;
}

async function ensureWinnerSegmentLoaded(){
  if (numeroGanador == null && ganadorUsuarioId == null) return;
  const exists = segments.some((segment) => segmentMatchesWinner(segment));
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
        : "La ruleta todavía no está activa. Sigue aquí viendo cómo avanza la ronda.";
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
      scheduleNextPoll(ZERO_EDGE_POLL_VISIBLE_MS);
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
      await fetchNumerosRuleta();
    } else {
      await ensureWinnerSegmentLoaded();
    }

    if (!didSpin && estado === "finished" && numeroGanador) {
      if (!did321) { did321 = true; await show321(); }
      didSpin = true;
      stopIdleSpin();
      const animated = await spinToWinner({ winnerNumero: numeroGanador, winnerUserId: ganadorUsuarioId });
      if (!animated) {
        setWheelToWinner({ winnerNumero: numeroGanador, winnerUserId: ganadorUsuarioId });
      }
      showResult(ganadorNombre);
    }

    if (prevGanador && numeroGanador && prevGanador !== numeroGanador && !spinning) {
      didSpin = true;
      stopIdleSpin();
      await ensureWinnerSegmentLoaded();
      const animated = await spinToWinner({ winnerNumero: numeroGanador, winnerUserId: ganadorUsuarioId });
      if (!animated) {
        setWheelToWinner({ winnerNumero: numeroGanador, winnerUserId: ganadorUsuarioId });
      }
      showResult(ganadorNombre);
    }

    livePollErrorCount = 0;

  } catch(_e){
    livePollErrorCount += 1;
  } finally {
    pollInFlight = false;
    scheduleNextPoll();
  }
}

function handleLiveVisibilityRefresh(){
  if (!token || !sorteoId) return;

  if (document.visibilityState === "visible") {
    lastNumbersFetchAtMs = 0;
    scheduleNextPoll(320);
    return;
  }

  scheduleNextPoll();
}

// =========================
// INIT
// =========================
(async function init(){
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../login.html' })
    : null;

  token = localStorage.getItem('token') || '';
  if (!token || !user?.id) {
    return;
  }

  if(!sorteoId){
    elSubtitle.textContent = "Falta sorteoId en la URL. Usa ?sorteo=123";
    return;
  }

  try{
    const [
      ,
      ,
      liveChatReady,
    ] = await Promise.all([
      fetchRuletaInfo(),
      fetchNumerosRuleta({ force: true }),
      fetchMisNumerosParaLista(),
      waitForLiveChatBridge(),
    ]);

    if (liveChatReady) {
      window.initRuletaLiveChat({ sorteoId, token });
      syncChatPhaseState(estado);
    }

    if (estado === "finished" && numeroGanador) {
      await ensureWinnerSegmentLoaded();
      setWheelToWinner({ winnerNumero: numeroGanador, winnerUserId: ganadorUsuarioId });
      showResult(ganadorNombre);
      didSpin = true;
    }

    // 3) empezar contador
    tick();

    // 4) polling
    scheduleNextPoll();
    document.addEventListener("visibilitychange", handleLiveVisibilityRefresh);
    window.addEventListener("focus", handleLiveVisibilityRefresh);

  }catch(err){
    elSubtitle.textContent = "No se pudo conectar con la ronda en vivo.";
  }
})();







