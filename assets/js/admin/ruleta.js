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
const liveLiquidacionPanelEl = document.getElementById('liveLiquidacionPanel');
const liveLiquidacionTitleEl = document.getElementById('liveLiquidacionTitle');
const liveLiquidacionStatusEl = document.getElementById('liveLiquidacionStatus');
const liveLiquidacionHintEl = document.getElementById('liveLiquidacionHint');
const liveLiquidacionStatsEl = document.getElementById('liveLiquidacionStats');
const liveLiquidacionGanadoresEl = document.getElementById('liveLiquidacionGanadores');
const liveLiquidacionGanadoresCountEl = document.getElementById('liveLiquidacionGanadoresCount');
const liveLiquidacionReferidosEl = document.getElementById('liveLiquidacionReferidos');
const liveLiquidacionReferidosCountEl = document.getElementById('liveLiquidacionReferidosCount');
const liveLiquidacionWarningsEl = document.getElementById('liveLiquidacionWarnings');
const btnRefreshLiquidacion = document.getElementById('btnRefreshLiquidacion');
const btnFinalizarLive = document.getElementById('btnFinalizarLive');
const btnExportarLiquidacionPdf = document.getElementById('btnExportarLiquidacionPdf');
const btnDescargarLiquidacionHtml = document.getElementById('btnDescargarLiquidacionHtml');

// Estado en memoria
let participantes = [];
let rotacionActual = 0;
let girando = false;

let ruletaInfo = null;
let liveLiquidacion = null;
let liveLiquidacionLastFetchedAt = 0;
let countdownInterval = null;
let pollingInterval = null;
let autoSpinIniciado = false;
let autoSpinTimer = null;
let spinVisualActivo = false;
let pollingInFlight = false;
let pollingErrorCount = 0;
let pollingListenersBound = false;

const PRE_SPIN_DURATION_MS = 7000;
const FINAL_SPIN_DURATION_MS = 4700;
const LIVE_LIQUIDACION_MIN_REFRESH_MS = 15000;
const ADMIN_POLL_WAITING_MS = 10000;
const ADMIN_POLL_DEFAULT_MS = 5000;
const ADMIN_POLL_COUNTDOWN_MS = 2500;
const ADMIN_POLL_SPINNING_MS = 1500;
const ADMIN_POLL_HIDDEN_MS = 20000;
const ADMIN_POLL_MAX_BACKOFF_MS = 60000;

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

function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    hour12: false,
  });
}

function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const liveMeta = getLiveMeta();
  const currentLivePrize = getCurrentLivePrize();

  if (isLive) {
    if (liveMeta?.schema_incomplete) {
      return Array.isArray(liveMeta.warnings) && liveMeta.warnings.length
        ? liveMeta.warnings[0]
        : 'Faltan migraciones Live en la base de datos y no se puede programar esta ronda todavia.';
    }
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
  const schemaIncomplete = Boolean(liveMeta.schema_incomplete);
  const schemaWarning = Array.isArray(liveMeta.warnings) && liveMeta.warnings.length
    ? liveMeta.warnings[0]
    : 'Faltan migraciones Live en la base de datos.';

  if (livePremioPanelTitleEl) {
    livePremioPanelTitleEl.textContent = schemaIncomplete
      ? 'Live pendiente de migraciones'
      : premioActual
      ? `Premio actual: ${premioActual.nombre}`
      : 'Live listo para cierre';
  }

  if (livePremioBadgeEl) {
    livePremioBadgeEl.textContent = schemaIncomplete ? 'Migraciones' : `${restantes} pendientes`;
  }

  if (livePremioResumenEl) {
    livePremioResumenEl.textContent = schemaIncomplete
      ? 'La vista Live esta en modo de respaldo hasta completar las migraciones.'
      : `${entregados}/${total} entregados · ${elegibles} elegibles`;
  }

  if (livePremioActualEl) {
    if (schemaIncomplete) {
      livePremioActualEl.innerHTML = `
        <div class="live-prize-current__eyebrow">Migracion pendiente</div>
        <div class="live-prize-current__name">No se pudo cargar la configuracion Live completa.</div>
        <p>${escapeHtml(schemaWarning)}</p>
      `;
    } else if (premioActual) {
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
    livePremioHintEl.textContent = schemaIncomplete
      ? schemaWarning
      : premioActual
      ? elegibles > 0
        ? 'El giro sacara un ganador nuevo y lo enviara directo a Live cuentas.'
        : 'Ya no quedan participantes elegibles para seguir girando este Live.'
      : 'Todos los premios configurados para este Live ya quedaron registrados.';
  }

  if (livePremioHistorialEl) {
    const historial = Array.isArray(liveMeta.historial) ? [...liveMeta.historial].reverse() : [];
    if (schemaIncomplete) {
      livePremioHistorialEl.innerHTML = `<p class="live-prize-empty">${escapeHtml(schemaWarning)}</p>`;
    } else if (!historial.length) {
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

function renderLiquidacionStats(report) {
  if (!liveLiquidacionStatsEl) return;

  const resumen = report?.resumen;
  if (!resumen) {
    liveLiquidacionStatsEl.innerHTML = '';
    return;
  }

  const items = [
    {
      label: 'Recaudo confirmado',
      value: formatMoney(resumen.recaudoConfirmado) || '$0',
      meta: `${resumen.participantesAprobados || 0} participantes aprobados`,
    },
    {
      label: 'Utilidad confirmada',
      value: formatMoney(resumen.utilidadNetaConfirmada) || '$0',
      meta: 'Solo toma pagos ya completados',
    },
    {
      label: 'Utilidad proyectada',
      value: formatMoney(resumen.utilidadNetaProyectada) || '$0',
      meta: 'Incluye pendientes Live actuales',
    },
    {
      label: 'Pagos por referidos',
      value: formatMoney(resumen.referidosPagados) || '$0',
      meta: `Pendiente: ${formatMoney(resumen.referidosPendientes) || '$0'}`,
    },
    {
      label: 'Premios de efectivo',
      value: formatMoney(resumen.premiosEfectivoPagados) || '$0',
      meta: `Sorteados: ${formatMoney(resumen.premiosEfectivoSorteados) || '$0'}`,
    },
    {
      label: 'Premios extra',
      value: formatMoney(resumen.premiosExtraPagados) || '$0',
      meta: `Pendiente: ${formatMoney(resumen.premiosExtraPendientes) || '$0'}`,
    },
    {
      label: 'Beneficios de entrada',
      value: `${resumen.beneficiosEntradaEntregados || 0} entregados`,
      meta: `${resumen.beneficiosEntradaPendientes || 0} pendientes`,
    },
    {
      label: 'Operaciones Live',
      value: `${resumen.operacionesCompletadasCantidad || 0} completadas`,
      meta: `${resumen.operacionesPendientesCantidad || 0} pendientes`,
    },
  ];

  liveLiquidacionStatsEl.innerHTML = items
    .map((item) => `
      <article class="live-liquidation-stat">
        <span class="live-liquidation-stat__label">${escapeHtml(item.label)}</span>
        <span class="live-liquidation-stat__value">${escapeHtml(item.value)}</span>
        <span class="live-liquidation-stat__meta">${escapeHtml(item.meta)}</span>
      </article>
    `)
    .join('');
}

function renderLiquidacionGanadores(report) {
  const ganadores = Array.isArray(report?.ganadores) ? report.ganadores : [];
  if (liveLiquidacionGanadoresCountEl) {
    liveLiquidacionGanadoresCountEl.textContent = String(ganadores.length);
  }

  if (!liveLiquidacionGanadoresEl) return;

  if (!ganadores.length) {
    liveLiquidacionGanadoresEl.innerHTML =
      '<p class="live-liquidation-empty">Todavia no hay ganadores registrados en este Live.</p>';
    return;
  }

  liveLiquidacionGanadoresEl.innerHTML = ganadores
    .map((item) => {
      const amount = formatMoney(item.premioMonto);
      const ganador = item.usuarioAlias || item.usuarioNombre || `Usuario ${item.usuarioId}`;
      return `
        <article class="live-liquidation-item">
          <div class="live-liquidation-item__top">
            <strong>${escapeHtml(item.premioNombre || 'Premio')}</strong>
            <span>#${escapeHtml(item.numero)}</span>
          </div>
          <div class="live-liquidation-item__meta">
            <span>${escapeHtml(ganador)}</span>
            <span>${escapeHtml(amount || (item.premioTipo || 'otro').toUpperCase())}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderLiquidacionReferidos(report) {
  const referidosPendientes = Array.isArray(report?.referidos?.pendientesLiquidacion)
    ? report.referidos.pendientesLiquidacion
    : [];
  const referidos = referidosPendientes.length
    ? referidosPendientes
    : (Array.isArray(report?.referidos?.resumen) ? report.referidos.resumen : []);
  if (liveLiquidacionReferidosCountEl) {
    liveLiquidacionReferidosCountEl.textContent = String(referidos.length);
  }

  if (!liveLiquidacionReferidosEl) return;

  if (!referidos.length) {
    liveLiquidacionReferidosEl.innerHTML =
      '<p class="live-liquidation-empty">Todavia no hay progreso de referidos para este Live.</p>';
    return;
  }

  liveLiquidacionReferidosEl.innerHTML = referidos
    .map((item) => {
      const currentRule = item.reglaActual
        ? `Regla actual: ${item.reglaActual.minimoReferidos} (${formatMoney(item.reglaActual.recompensaMonto) || '$0'})`
        : 'Sin regla de pago configurada';
      const queueStatus = item.enColaAdminCuentas
        ? `En cola admin cuentas: ${formatMoney(item.referidoPendiente) || '$0'}`
        : item.siguienteObjetivo
          ? `Le faltan ${item.siguienteObjetivo.faltan} para la meta ${item.siguienteObjetivo.minimoReferidos}`
          : 'Sin pagos pendientes en cola';
      const alias = item.usuarioAlias ? `@${item.usuarioAlias}` : item.usuarioNombre;
      return `
        <article class="live-liquidation-item">
          <div class="live-liquidation-item__top">
            <strong>${escapeHtml(alias || `Usuario ${item.usuarioId}`)}</strong>
            <span>${escapeHtml(String(item.totalAprobados))} aprobados</span>
          </div>
          <div class="live-liquidation-item__meta">
            <span>${escapeHtml(currentRule)}</span>
            <span>${escapeHtml(queueStatus)}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderLiquidacionWarnings(report) {
  if (!liveLiquidacionWarningsEl) return;

  const blocks = [];
  const blockingReasons = Array.isArray(report?.blockingReasons) ? report.blockingReasons : [];
  const warnings = Array.isArray(report?.warnings) ? report.warnings : [];

  blocks.push(
    ...blockingReasons.map((message) => ({
      className: 'live-liquidation-warning',
      message,
    }))
  );
  blocks.push(
    ...warnings.map((message) => ({
      className: 'live-liquidation-warning',
      message,
    }))
  );

  if (!blocks.length) {
    liveLiquidacionWarningsEl.innerHTML = '';
    return;
  }

  liveLiquidacionWarningsEl.innerHTML = blocks
    .map((item) => `<div class="${item.className}">${escapeHtml(item.message)}</div>`)
    .join('');
}

function renderLiveLiquidacion() {
  if (!liveLiquidacionPanelEl) return;

  if (ruletaInfo?.modalidad !== 'live') {
    liveLiquidacionPanelEl.hidden = true;
    return;
  }

  liveLiquidacionPanelEl.hidden = false;

  if (!liveLiquidacion) {
    if (liveLiquidacionTitleEl) {
      liveLiquidacionTitleEl.textContent = 'Resumen del Live';
    }
    if (liveLiquidacionStatusEl) {
      liveLiquidacionStatusEl.textContent = 'Cargando';
      liveLiquidacionStatusEl.classList.remove('is-finalizado', 'is-blocked');
    }
    if (liveLiquidacionHintEl) {
      liveLiquidacionHintEl.textContent =
        'Cargando la liquidacion del Live para mostrarte el cierre, los pendientes y las exportaciones.';
    }
    if (liveLiquidacionStatsEl) liveLiquidacionStatsEl.innerHTML = '';
    if (liveLiquidacionGanadoresEl) {
      liveLiquidacionGanadoresEl.innerHTML =
        '<p class="live-liquidation-empty">Cargando ganadores...</p>';
    }
    if (liveLiquidacionReferidosEl) {
      liveLiquidacionReferidosEl.innerHTML =
        '<p class="live-liquidation-empty">Cargando referidos...</p>';
    }
    if (liveLiquidacionWarningsEl) liveLiquidacionWarningsEl.innerHTML = '';
    if (btnFinalizarLive) btnFinalizarLive.disabled = true;
    return;
  }

  const isFinalizado = liveLiquidacion?.sorteo?.estado === 'finalizado';
  const canFinalize = Boolean(liveLiquidacion?.canFinalize);

  if (liveLiquidacionTitleEl) {
    liveLiquidacionTitleEl.textContent = isFinalizado
      ? 'Live cerrado y liquidado'
      : 'Resumen del cierre Live';
  }

  if (liveLiquidacionStatusEl) {
    liveLiquidacionStatusEl.classList.remove('is-finalizado', 'is-blocked');
    if (isFinalizado) {
      liveLiquidacionStatusEl.textContent = 'Finalizado';
      liveLiquidacionStatusEl.classList.add('is-finalizado');
    } else if (!canFinalize) {
      liveLiquidacionStatusEl.textContent = 'Pendiente de cierre';
      liveLiquidacionStatusEl.classList.add('is-blocked');
    } else {
      liveLiquidacionStatusEl.textContent = 'Listo para cerrar';
    }
  }

  if (liveLiquidacionHintEl) {
    liveLiquidacionHintEl.textContent = isFinalizado
      ? `Cierre generado el ${formatDateTime(liveLiquidacion.generatedAt)}. Puedes exportarlo en archivo o imprimirlo a PDF.`
      : canFinalize
        ? 'El Live ya no tiene premios pendientes. Si todo esta correcto, puedes finalizarlo y exportar el reporte.'
        : 'Todavia hay elementos abiertos. Revisa el bloqueo abajo antes de cerrar este Live.';
  }

  renderLiquidacionStats(liveLiquidacion);
  renderLiquidacionGanadores(liveLiquidacion);
  renderLiquidacionReferidos(liveLiquidacion);
  renderLiquidacionWarnings(liveLiquidacion);

  if (btnFinalizarLive) {
    btnFinalizarLive.disabled = isFinalizado || !canFinalize;
  }
}

function buildLiquidacionReportHtml(report) {
  const title = report?.sorteo?.descripcion || `Live ${sorteoId}`;
  const rowsGanadores = Array.isArray(report?.ganadores) ? report.ganadores : [];
  const rowsOperaciones = Array.isArray(report?.operaciones) ? report.operaciones : [];
  const rowsReferidos = Array.isArray(report?.referidos?.resumen) ? report.referidos.resumen : [];

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Liquidacion ${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }
        h1, h2 { margin-bottom: 8px; }
        p { margin: 4px 0; line-height: 1.45; }
        .meta { color: #4b5563; margin-bottom: 18px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #f9fafb; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #2563eb; font-weight: 700; }
        .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 13px; }
        th { background: #eff6ff; }
        .section { margin-top: 24px; }
        .warn { border-radius: 10px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fcd34d; margin-top: 8px; }
      </style>
    </head>
    <body>
      <h1>Liquidacion Live</h1>
      <p class="meta">${escapeHtml(title)} · generado ${escapeHtml(formatDateTime(report?.generatedAt))}</p>
      <p><strong>Estado:</strong> ${escapeHtml(report?.sorteo?.estado || '')}</p>
      <p><strong>Premio resumen:</strong> ${escapeHtml(report?.sorteo?.premio || '')}</p>
      <div class="grid">
        <div class="card"><div class="label">Recaudo confirmado</div><div class="value">${escapeHtml(formatMoney(report?.resumen?.recaudoConfirmado) || '$0')}</div></div>
        <div class="card"><div class="label">Utilidad confirmada</div><div class="value">${escapeHtml(formatMoney(report?.resumen?.utilidadNetaConfirmada) || '$0')}</div></div>
        <div class="card"><div class="label">Utilidad proyectada</div><div class="value">${escapeHtml(formatMoney(report?.resumen?.utilidadNetaProyectada) || '$0')}</div></div>
        <div class="card"><div class="label">Referidos pagados</div><div class="value">${escapeHtml(formatMoney(report?.resumen?.referidosPagados) || '$0')}</div></div>
      </div>

      <div class="section">
        <h2>Ganadores</h2>
        <table>
          <thead>
            <tr><th>Premio</th><th>Tipo</th><th>Ganador</th><th>Numero</th><th>Monto</th></tr>
          </thead>
          <tbody>
            ${rowsGanadores.length
              ? rowsGanadores.map((item) => `
                <tr>
                  <td>${escapeHtml(item.premioNombre || '')}</td>
                  <td>${escapeHtml((item.premioTipo || '').toUpperCase())}</td>
                  <td>${escapeHtml(item.usuarioAlias || item.usuarioNombre || `Usuario ${item.usuarioId}`)}</td>
                  <td>#${escapeHtml(item.numero)}</td>
                  <td>${escapeHtml(formatMoney(item.premioMonto) || '-')}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="5">Sin ganadores registrados.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Operaciones Live</h2>
        <table>
          <thead>
            <tr><th>Tipo</th><th>Estado</th><th>Usuario</th><th>Monto</th><th>Descripcion</th></tr>
          </thead>
          <tbody>
            ${rowsOperaciones.length
              ? rowsOperaciones.map((item) => `
                <tr>
                  <td>${escapeHtml(item.tipo || '')}</td>
                  <td>${escapeHtml(item.estado || '')}</td>
                  <td>${escapeHtml(item.usuarioAlias || item.usuarioNombre || `Usuario ${item.usuarioId}`)}</td>
                  <td>${escapeHtml(formatMoney(item.monto) || '-')}</td>
                  <td>${escapeHtml(item.descripcion || '')}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="5">Sin operaciones registradas.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Referidos</h2>
        <table>
          <thead>
            <tr><th>Usuario</th><th>Aprobados</th><th>Pendientes</th><th>Pagado</th><th>Pendiente</th><th>Siguiente meta</th></tr>
          </thead>
          <tbody>
            ${rowsReferidos.length
              ? rowsReferidos.map((item) => `
                <tr>
                  <td>${escapeHtml(item.usuarioAlias || item.usuarioNombre || `Usuario ${item.usuarioId}`)}</td>
                  <td>${escapeHtml(item.totalAprobados)}</td>
                  <td>${escapeHtml(item.totalPendientes)}</td>
                  <td>${escapeHtml(formatMoney(item.referidoPagado) || '$0')}</td>
                  <td>${escapeHtml(formatMoney(item.referidoPendiente) || '$0')}</td>
                  <td>${escapeHtml(item.siguienteObjetivo ? `${item.siguienteObjetivo.minimoReferidos} referidos` : 'Sin meta pendiente')}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="6">Sin progreso de referidos.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Notas</h2>
        ${(Array.isArray(report?.warnings) ? report.warnings : []).map((warning) => `<div class="warn">${escapeHtml(warning)}</div>`).join('') || '<p>Sin notas adicionales.</p>'}
      </div>
    </body>
    </html>
  `;
}

async function fetchLiveLiquidacion(force = false) {
  if (!sorteoId || ruletaInfo?.modalidad !== 'live') {
    liveLiquidacion = null;
    liveLiquidacionLastFetchedAt = 0;
    renderLiveLiquidacion();
    return;
  }

  const now = Date.now();
  if (
    !force &&
    liveLiquidacionLastFetchedAt &&
    now - liveLiquidacionLastFetchedAt < LIVE_LIQUIDACION_MIN_REFRESH_MS
  ) {
    return;
  }

  try {
    const res = await fetch(`${API}/sorteos/${sorteoId}/live-liquidacion`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Error live-liquidacion:', data);
      liveLiquidacion = null;
      renderLiveLiquidacion();
      return;
    }

    liveLiquidacion = data;
    liveLiquidacionLastFetchedAt = now;
    renderLiveLiquidacion();
  } catch (err) {
    console.error('Error fetchLiveLiquidacion:', err);
    liveLiquidacion = null;
    renderLiveLiquidacion();
  }
}

async function finalizarLiveActual() {
  if (!sorteoId || !liveLiquidacion) return;
  if (!liveLiquidacion.canFinalize) {
    alert((liveLiquidacion.blockingReasons || []).join('\n') || 'Este Live todavia no se puede cerrar.');
    return;
  }

  const ok = confirm('Vas a finalizar este Live y dejar cerrada la liquidacion actual. ¿Deseas continuar?');
  if (!ok) return;

  if (btnFinalizarLive) btnFinalizarLive.disabled = true;

  try {
    const res = await fetch(`${API}/sorteos/${sorteoId}/finalizar-live`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Error finalizar-live:', data);
      alert(data.error || 'No se pudo finalizar el Live.');
      renderLiveLiquidacion();
      return;
    }

    liveLiquidacion = data.report || liveLiquidacion;
    const opsCreadas = Number(data?.referidos?.operacionesCreadas || 0);
    const resumenExtra = opsCreadas > 0
      ? `\n\nReferidos listos en admin cuentas: ${opsCreadas}.`
      : '';
    alert((data.message || 'Live finalizado correctamente.') + resumenExtra);
    await fetchRuletaInfo();
    await fetchRuletaParticipantes();
  } catch (err) {
    console.error('Error finalizarLiveActual:', err);
    alert('Error de red al finalizar el Live.');
  } finally {
    renderLiveLiquidacion();
  }
}

function exportLiveLiquidacionPdf() {
  if (!liveLiquidacion) {
    alert('Todavia no hay liquidacion cargada para exportar.');
    return;
  }

  const popup = window.open('', '_blank');
  if (!popup) {
    alert('Tu navegador bloqueo la ventana de impresion. Prueba permitir ventanas emergentes.');
    return;
  }

  popup.document.open();
  popup.document.write(buildLiquidacionReportHtml(liveLiquidacion));
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
}

function downloadLiveLiquidacionHtml() {
  if (!liveLiquidacion) {
    alert('Todavia no hay liquidacion cargada para descargar.');
    return;
  }

  const sorteoLabel = (liveLiquidacion.sorteo?.descripcion || `live-${sorteoId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `liquidacion-${sorteoLabel || `live-${sorteoId}`}.html`;
  downloadTextFile(filename, buildLiquidacionReportHtml(liveLiquidacion), 'text/html;charset=utf-8');
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
  if (!pollingListenersBound) {
    pollingListenersBound = true;

    window.addEventListener('focus', () => {
      scheduleRuletaPolling(500);
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        scheduleRuletaPolling(500);
      }
    });
  }

  scheduleRuletaPolling(800);
}

function stopRuletaPolling() {
  if (pollingInterval) {
    clearTimeout(pollingInterval);
    pollingInterval = null;
  }
}

function getRuletaPollingBaseDelay() {
  if (document.hidden) return ADMIN_POLL_HIDDEN_MS;

  const estado = String(ruletaInfo?.ruleta_estado || '').toLowerCase();
  if (estado === 'girando') return ADMIN_POLL_SPINNING_MS;
  if (estado === 'programada') return ADMIN_POLL_COUNTDOWN_MS;
  if (estado === 'no_programada') return ADMIN_POLL_WAITING_MS;
  return ADMIN_POLL_DEFAULT_MS;
}

function getRuletaPollingDelay() {
  const baseDelay = getRuletaPollingBaseDelay();
  if (pollingErrorCount <= 0) {
    return baseDelay;
  }

  const multiplier = Math.min(2 ** Math.min(pollingErrorCount - 1, 2), 4);
  return Math.min(baseDelay * multiplier, ADMIN_POLL_MAX_BACKOFF_MS);
}

function scheduleRuletaPolling(delayMs = getRuletaPollingDelay()) {
  stopRuletaPolling();
  pollingInterval = setTimeout(runRuletaPollingCycle, delayMs);
}

async function runRuletaPollingCycle() {
  if (pollingInFlight) {
    scheduleRuletaPolling(300);
    return;
  }

  if (document.hidden) {
    scheduleRuletaPolling();
    return;
  }

  pollingInFlight = true;

  try {
    await fetchRuletaInfo();
    if (!ruletaInfo || ruletaInfo.ruleta_estado !== 'finalizada') {
      await fetchRuletaParticipantes();
    }
    pollingErrorCount = 0;
  } catch (err) {
    pollingErrorCount += 1;
    console.error('Error polling ruleta:', err);
  } finally {
    pollingInFlight = false;
    scheduleRuletaPolling();
  }
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
    stopRuletaPolling();
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
    stopRuletaPolling();
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
      pollingErrorCount = 0;
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
      pollingErrorCount = 0;
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
    pollingErrorCount = 0;
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
    pollingErrorCount = 0;
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

  // Polling inteligente según estado de la ronda
  startRuletaPolling();
}

init();






