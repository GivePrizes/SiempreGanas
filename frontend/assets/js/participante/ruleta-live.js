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

const params = new URLSearchParams(location.search);
const sorteoId = params.get("sorteo") || params.get("sorteoId");

const elSubtitle = document.getElementById("subtitle");
const elEstado = document.getElementById("badgeEstado");
const elCountdown = document.getElementById("countdown");
const audioWin = document.getElementById("audioWin");
const elHint = document.getElementById("countdownHint");
const elBar = document.getElementById("progressBar");
const elOverlay = document.getElementById("overlay");
const elOverlayNum = document.getElementById("overlayNum");
const elResult = document.getElementById("result");

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let estado = "no_programada";
let programadaPara = null; // Date
let numeroGanador = null;

let serverSkewMs = 0; // si luego agregas serverTime a ruleta-info, se usa

let segments = []; // [{numero:1}, ...]
let wheelAngle = 0; // rad
let spinning = false;

let did321 = false;
let didSpin = false;

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

  // 🔊 reproducir sonido ganador
  if (audioWin) {
    audioWin.currentTime = 0;
    audioWin.play().catch(() => {
      // autoplay bloqueado (normal en algunos navegadores)
      // no hacemos nada, el sistema sigue funcionando
    });
  }
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
// FETCH (ruleta-info + numeros)
// =========================
async function fetchRuletaInfo(){
  const res = await fetch(`${apiBase}/api/sorteos/${sorteoId}/ruleta-info`, {
    headers: authHeaders()
  });

  if(!res.ok) throw new Error("No se pudo cargar ruleta-info");
  const data = await res.json();

  if (data.serverTime) {
    serverSkewMs = new Date(data.serverTime).getTime() - Date.now();
  }

  estado = data.ruleta_estado || "no_programada";
  programadaPara = data.ruleta_hora_programada ? new Date(data.ruleta_hora_programada) : null;

  numeroGanador =
    (data.ruleta_log && data.ruleta_log.ganador_numero != null)
      ? data.ruleta_log.ganador_numero
      : (data.numero_ganador ?? null);

  setEstadoBadge(safeUpper(estado));

  elSubtitle.textContent =
    estado === "no_programada" ? "Aún no han programado la ruleta." :
    estado === "programada" ? "Ruleta programada. Quédate aquí para verla en vivo." :
    estado === "finalizada" ? "Ruleta finalizada. Resultado oficial registrado." :
    "Actualizando…";

  // snapshot oficial si existe
  if (data.ruleta_log && Array.isArray(data.ruleta_log.participantes) && data.ruleta_log.participantes.length){
    segments = data.ruleta_log.participantes
      .filter(p => p && p.numero != null)
      .map(p => ({ numero: Number(p.numero) }))
      .sort((a,b) => a.numero - b.numero);
  }

  drawWheel();

  // si ya está finalizada, animar UNA sola vez
  if (estado === "finalizada" && numeroGanador && !didSpin && segments.length){
    const ganadorNombre = data?.ganador?.nombre || null;

    if (!did321) { did321 = true; await show321(); }

    didSpin = true;
    spinToWinner(numeroGanador);
    showResult(ganadorNombre);
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
  if(!programadaPara){
    elCountdown.textContent = "--:--";
    elHint.textContent = "Esperando programación del admin…";
    elBar.style.width = "0%";
    requestAnimationFrame(tick);
    return;
  }

  const diff = programadaPara.getTime() - nowServerMs();

  if(diff > 0){
    elCountdown.textContent = fmtMMSS(diff);
    elHint.textContent = "La ruleta iniciará automáticamente al llegar a 00:00.";

    // progreso visual (solo estético)
    const pct = Math.max(0, Math.min(100, 100 - (diff / (10 * 60 * 1000)) * 100));
    elBar.style.width = `${pct}%`;

    // 3-2-1 en los últimos 3.2s (solo una vez)
    if(diff <= 3200 && !did321){
      did321 = true;
      show321();
    }

  } else {
    elCountdown.textContent = "00:00";
    elHint.textContent = "Iniciando… esperando resultado oficial.";
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

        // si cambia a finalizada, asegúrate de tener segments (ideal snapshot)
        if ((prevEstado !== "finalizada" && estado === "finalizada") && !segments.length) {
          await fetchNumerosSiHaceFalta();
        }

        // si aparece ganador y no hemos girado
        if (!didSpin && estado === "finalizada" && numeroGanador) {
          // si no hay snapshot, igual se puede animar con segmentos actuales
          didSpin = true;
          if (!did321) { did321 = true; await show321(); }
          spinToWinner(numeroGanador);
          const ganadorNombre = data?.ganador?.nombre || null;
          showResult(ganadorNombre);
        }

        // si cambia ganador (poco probable), re-anima
        if (prevGanador && numeroGanador && prevGanador !== numeroGanador && !spinning) {
          didSpin = true;
          spinToWinner(numeroGanador);
        }

      } catch(_e){
        // silencioso
      }
    }, 1500);

  }catch(err){
    elSubtitle.textContent = "No se pudo conectar con la ruleta.";
  }
})();
