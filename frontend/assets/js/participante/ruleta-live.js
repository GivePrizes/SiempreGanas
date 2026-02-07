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

const elSubtitle = document.getElementById("subtitle");
const elEstado = document.getElementById("badgeEstado");
const elCountdown = document.getElementById("countdown");
const audioWin = document.getElementById("audioWin");
const elHint = document.getElementById("countdownHint");
const elBar = document.getElementById("progressBar");
const elOverlay = document.getElementById("overlay");
const elOverlayNum = document.getElementById("overlayNum");
const elResult = document.getElementById("result");
const elSystemFeed = document.getElementById("systemFeed");
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
  "La suerte está girando contigo…",
  "Prepárate, el destino se acerca…",
  "¿Será tu número el elegido?",
];

let chatWindowEndsAt = null;
let chatWindowTimer = null;

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

function pushSystemMessage(text, key){
  if (!elSystemFeed) return;
  const k = key || text;
  if (lastSystemKeys.has(k)) return;
  lastSystemKeys.add(k);

  const row = document.createElement("div");
  row.className = "systemMsg";
  row.innerHTML = `
    <div class="systemAvatar" aria-hidden="true">SG</div>
    <div class="systemBubble">
      <div class="systemMeta">Sistema</div>
      <div class="systemText">${text}</div>
    </div>
  `;
  elSystemFeed.prepend(row);
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
function drawWheel(){
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const radius = Math.min(cx, cy) - 14;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelAngle);

  const n = Math.max(1, segments.length);
  const slice = (Math.PI * 2) / n;

  for(let i=0;i<n;i++){
    const a0 = i * slice;
    const a1 = a0 + slice;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,radius,a0,a1);
    ctx.closePath();

    ctx.fillStyle = (i % 2 === 0)
      ? "rgba(250,204,21,.18)"
      : "rgba(255,255,255,.08)";
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const numero = segments[i]?.numero ?? (i+1);
    const label = `#${String(numero).padStart(2,"0")}`;

    ctx.save();
    ctx.rotate(a0 + slice/2);
    ctx.translate(radius * 0.70, 0);
    ctx.rotate(Math.PI/2);

    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "900 22px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  // ring
  ctx.rotate(-wheelAngle);
  ctx.beginPath();
  ctx.arc(0,0,radius+6,0,Math.PI*2);
  ctx.strokeStyle = "rgba(250,204,21,.95)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // center
  ctx.beginPath();
  ctx.arc(0,0,46,0,Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 16px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SIEMPRE", 0, -10);
  ctx.fillText("GANAS", 0, 12);

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
    pushSystemMessage(`🏆 ¡Tenemos ganador! Número ${num}`, `win_num_${numeroGanador}`);
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
  if(spinning || !segments.length) return;
  const idx = segments.findIndex(s => Number(s.numero) === Number(winnerNumero));
  if(idx < 0) return;

  const n = segments.length;
  const slice = (Math.PI * 2) / n;

  // puntero arriba (-90°)
  const targetAngle = idx * slice + slice/2;
  const up = -Math.PI/2;

  const extraTurns = 6 + Math.floor(Math.random() * 3); // 6-8 vueltas
  const final = up - targetAngle + extraTurns * Math.PI * 2;

  const start = wheelAngle;
  const delta = final - start;

  const duration = 5200;
  const t0 = performance.now();
  spinning = true;

  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }

  function frame(t){
    const p = Math.min(1, (t - t0) / duration);
    wheelAngle = start + delta * easeOutCubic(p);
    drawWheel();
    if(p < 1) requestAnimationFrame(frame);
    else{
      spinning = false;
      wheelAngle = final % (Math.PI * 2);
      drawWheel();
    }
  }

  requestAnimationFrame(frame);
}

// =========================
// FETCH LIVE STATE
// =========================
async function fetchRuletaInfo(){
  const res = await fetch(`${apiBase}/api/sorteos/${sorteoId}/live`, {
    headers: authHeaders()
  });

  if(!res.ok) throw new Error("No se pudo cargar live");
  const data = await res.json();

  if (data.server_time) {
    serverSkewMs = new Date(data.server_time).getTime() - Date.now();
  }

  estado = data.estado || "waiting";

  if (estado === "legacy") {
    estado = "waiting";
  }

  if (estado === "countdown" && typeof data.countdown_seconds === "number") {
    const serverMs = data.server_time ? new Date(data.server_time).getTime() : Date.now();
    countdownEndsAtMs = serverMs + data.countdown_seconds * 1000;

    if (countdownStartSeconds == null || data.countdown_seconds > countdownStartSeconds) {
      countdownStartSeconds = data.countdown_seconds;
    }
  }

  if (estado === "finished") {
    const ganador = data.ganador ?? null;
    if (ganador && typeof ganador === "object") {
      numeroGanador = ganador.numero ?? ganador.numero_ganador ?? null;
      ganadorNombre = ganador.nombre ?? null;
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
    estado === "waiting" ? "La ruleta aún no ha sido programada." :
    estado === "countdown" ? "Cuenta regresiva en marcha. Quédate aquí." :
    estado === "spinning" ? "🎯 La ruleta está girando…" :
    estado === "finished" ? "🏆 Resultado oficial confirmado." :
    "Actualizando…";

  if (lastEstado !== estado) {
    if (estado === "waiting") {
      pushSystemMessage("⏳ La ruleta comenzará en breve", "estado_waiting");
      pushSystemMessage("Prepárate, el sorteo comenzará pronto", "waiting_prep");
      setChatEnabled(false, "El chat se habilita cuando comience el giro.");
    }
    if (estado === "countdown") {
      pushSystemMessage("⏳ La ruleta comienza en breve", "estado_countdown");
      setChatEnabled(true, "Chat activo · la ruleta está programada.");
    }
    if (estado === "spinning") {
      pushSystemMessage("🎯 ¡La ruleta está girando!", "estado_spinning");
      pushSystemMessage("🍀 Mucha suerte a todos los participantes", "spinning_luck");
      setChatEnabled(true, "Chat activo · el cierre se anuncia al terminar.");
    }
    if (estado === "finished") {
      pushSystemMessage("🏆 Resultado confirmado. ¡Felicidades al ganador!", "estado_finished");
      pushSystemMessage("⏳ El chat se cerrará en 5 minutos", "chat_close_5min");
      startChatCountdown();
    }
    lastEstado = estado;
  }

  if (estado === "spinning") startIdleSpin();
  else stopIdleSpin();

  if (estado !== "finished") {
    elResult.classList.add("hidden");
  }

  return data;
}


async function fetchNumerosSiHaceFalta(){
  if (segments.length) return;

  const res = await fetch(`${apiBase}/api/sorteos/${sorteoId}/ruleta-numeros`, {
    headers: authHeaders()
    });
  if(!res.ok) throw new Error("No se pudo cargar ruleta-numeros");
  const data = await res.json();

  const nums = Array.isArray(data.numeros) ? data.numeros : [];
  segments = nums.map(n => ({ numero: Number(n) })).sort((a,b)=>a.numero-b.numero);
  drawWheel();
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
        : "Prepárate, el sorteo comenzará pronto";
    elBar.style.width = "0%";
    requestAnimationFrame(tick);
    return;
  }

  const diff = countdownEndsAtMs - nowServerMs();

  if(diff > 0){
    elCountdown.textContent = fmtMMSS(diff);
    const secondsLeft = Math.ceil(diff / 1000);
    elHint.textContent = `⏳ La ruleta comienza en ${secondsLeft} segundos`;

    if (secondsLeft <= 5 && secondsLeft > 0 && lastCountdownSecond !== secondsLeft) {
      pushSystemMessage(`🔥 ${secondsLeft}…`, `count_${secondsLeft}`);
      lastCountdownSecond = secondsLeft;
    }

    if (secondsLeft > 5 && secondsLeft % 5 === 0 && lastMotivationSecond !== secondsLeft) {
      const phrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
      pushSystemMessage(phrase, `mot_${secondsLeft}`);
      lastMotivationSecond = secondsLeft;
    }

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
    elCountdown.textContent = "00:00";
    elHint.textContent = "🎯 La ruleta está girando…";
    elBar.style.width = "100%";
  }

  requestAnimationFrame(tick);
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
    await fetchNumerosSiHaceFalta();

    // 3) empezar contador
    tick();

    // 4) polling
    setInterval(async () => {
      try{
        const prevEstado = estado;
        const prevGanador = numeroGanador;

        const data = await fetchRuletaInfo();

        if ((prevEstado !== "finished" && estado === "finished") && !segments.length) {
          await fetchNumerosSiHaceFalta();
        }

        if (!didSpin && estado === "finished" && numeroGanador) {
          if (!did321) { did321 = true; await show321(); }
          didSpin = true;
          stopIdleSpin();
          spinToWinner(numeroGanador);
          showResult(ganadorNombre);
        }

        if (prevGanador && numeroGanador && prevGanador !== numeroGanador && !spinning) {
          didSpin = true;
          stopIdleSpin();
          spinToWinner(numeroGanador);
        }

      } catch(_e){
        // silencioso
      }
    }, 2500);

  }catch(err){
    elSubtitle.textContent = "No se pudo conectar con la ruleta.";
  }
})();
