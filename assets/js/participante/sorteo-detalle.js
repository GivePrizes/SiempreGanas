// assets/js/participante/sorteo-detalle.js

const API_URL = window.API_URL || ''; // viene de config.js
// La conversación oficial vive dentro de ruleta-live.html.

// obtener sorteoId de la URL
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('id');
const referidoAliasParam = String(
  params.get('ref') || params.get('referido') || params.get('alias') || ''
).trim().toLowerCase();
const comprarOtroNumero = ['1', 'true', 'si'].includes(
  String(params.get('comprar') || '').toLowerCase()
);

const MAX_NUMEROS_POR_COMPRA = 1;

const tituloSorteo = document.getElementById('tituloSorteo');
const subtituloSorteo = document.getElementById('subtituloSorteo');
const tituloPremio = document.getElementById('tituloPremio');
const textoPremio = document.getElementById('textoPremio');
const textoPrecio = document.getElementById('textoPrecio');
const textoCantidad = document.getElementById('textoCantidad');
const textoProgreso = document.getElementById('textoProgreso');
const textoCupos = document.getElementById('textoCupos');
const progressFill = document.getElementById('progressFill');
const maxNumerosTexto = document.getElementById('maxNumerosTexto');

const gridNumeros = document.getElementById('gridNumeros');
const resumenNumeros = document.getElementById('resumenNumeros');
const resumenTotal = document.getElementById('resumenTotal');
const paymentSelectedNumbers = document.getElementById('paymentSelectedNumbers');
const paymentSelectedCount = document.getElementById('paymentSelectedCount');
const paymentSelectedTotal = document.getElementById('paymentSelectedTotal');
const paymentMethodSelect = document.getElementById('paymentMethodSelect');
const paymentPreviewCard = document.getElementById('paymentPreviewCard');
const paymentPreviewEmpty = document.getElementById('paymentPreviewEmpty');
const paymentPreviewContent = document.getElementById('paymentPreviewContent');
const paymentPreviewBadge = document.getElementById('paymentPreviewBadge');
const paymentPreviewTitle = document.getElementById('paymentPreviewTitle');
const paymentPreviewText = document.getElementById('paymentPreviewText');
const paymentQrPanel = document.getElementById('paymentQrPanel');
const paymentKeyPanel = document.getElementById('paymentKeyPanel');
const paymentNumberPanel = document.getElementById('paymentNumberPanel');

const inputComprobante = document.getElementById('inputComprobante');
const paymentUploadDropzone = document.getElementById('paymentUploadDropzone');
const paymentUploadFileText = document.getElementById('paymentUploadFileText');
const previewComprobante = document.getElementById('previewComprobante');
const imgPreview = document.getElementById('imgPreview');
const btnPagarNequiLink = document.getElementById('btnPagarNequiLink');
const imgQrNequi = document.getElementById('imgQrNequi');
const imgQrNequiFallback = document.getElementById('imgQrNequiFallback');
const nequiKeyText = document.getElementById('nequiKeyText');
const btnCopyNequiKey = document.getElementById('btnCopyNequiKey');
const nequiHolderNameText = document.getElementById('nequiHolderNameText');
const nequiNumeroText = document.getElementById('nequiNumeroText');
const btnCopyNequiNumero = document.getElementById('btnCopyNequiNumero');

const btnConfirmar = document.getElementById('btnConfirmar');
const toast = document.getElementById('toast');
const misNumerosEnSorteoCard = document.getElementById('misNumerosEnSorteoCard');
const misNumerosEnSorteoTexto = document.getElementById('misNumerosEnSorteoTexto');
const misNumerosEnSorteoChips = document.getElementById('misNumerosEnSorteoChips');
const estadoNoParticipante = document.getElementById('estadoNoParticipante');
const btnMisNumeros = document.getElementById('btnMisNumeros');
const btnChatOnline = document.getElementById('btnChatOnline');
const sinComprobante = document.getElementById('sinComprobante');
const pagadorDatos = document.getElementById('pagadorDatos');
const inputPagadorNombre = document.getElementById('inputPagadorNombre');
const inputPagadorTelefono = document.getElementById('inputPagadorTelefono');
const postConfirmActions = document.getElementById('postConfirmActions');
const btnPostLive = document.getElementById('btnPostLive');
const numbersStepAccordion = document.getElementById('numbersStepAccordion');
const paymentStepAccordion = document.getElementById('paymentStepAccordion');
const liveReferralCard = document.getElementById('liveReferralCard');
const liveReferralBadge = document.getElementById('liveReferralBadge');
const inputReferralAlias = document.getElementById('inputReferralAlias');
const liveReferralHint = document.getElementById('liveReferralHint');

const SORTEO_AUTO_REFRESH_MS = 12000;

let sorteoActual = null;
let numerosOcupados = [];
let seleccionados = [];
let precioNumero = 0;
const NEQUI_PAYMENT_LINKS = window.NEQUI_PAYMENT_LINKS || {};
let pagoMetodoActual = '';
let linkSeguroActual = null;
let redirectingToLiveRoom = false;
let sorteoAutoRefreshTimer = null;
let sorteoRemovedHandled = false;

if (maxNumerosTexto) maxNumerosTexto.textContent = MAX_NUMEROS_POR_COMPRA.toString();

function buildLiveRoomUrl({ focusChat = false } = {}) {
  const nextUrl = new URL('ruleta-live.html', window.location.href);
  nextUrl.searchParams.set('id', sorteoId);
  if (focusChat) nextUrl.searchParams.set('focus', 'chat');
  return nextUrl.toString();
}

function goToLiveRoom({ focusChat = false, replace = false, reason = '' } = {}) {
  if (!sorteoId || redirectingToLiveRoom) return;

  redirectingToLiveRoom = true;
  if (reason) {
    sessionStorage.setItem('ruletaLiveEntryReason', reason);
  }

  const nextUrl = buildLiveRoomUrl({ focusChat });
  if (replace) {
    location.replace(nextUrl);
    return;
  }

  location.href = nextUrl;
}

function isLiveRoomReady(sorteo = sorteoActual) {
  const estado = String(sorteo?.estado || sorteo?.sorteo_estado || '')
    .trim()
    .toLowerCase();
  const ruletaEstado = String(sorteo?.ruleta_estado || '')
    .trim()
    .toLowerCase();

  return (
    estado === 'lleno' ||
    estado === 'finalizado' ||
    ruletaEstado === 'programada' ||
    ruletaEstado === 'girando' ||
    ruletaEstado === 'finalizada'
  );
}

function updateQuickAccessButtons({ hasApprovedNumbers = false } = {}) {
  if (btnMisNumeros) {
    const liveReady = hasApprovedNumbers && isLiveRoomReady();
    const nextHref = liveReady ? buildLiveRoomUrl({ focusChat: true }) : 'mis-numeros.html';
    btnMisNumeros.onclick = () => {
      location.href = nextHref;
    };

    const labelEl = btnMisNumeros.querySelector('.btn-label');
    if (labelEl) {
      labelEl.textContent = liveReady ? 'Sala en vivo' : 'Mis números';
    }
  }

  if (btnChatOnline) {
    const labelEl = btnChatOnline.querySelector('.btn-label');
    if (labelEl) {
      labelEl.textContent = isLiveRoomReady() ? 'Ir al vivo' : 'Sala en vivo';
    }
  }
}

function startSorteoAutoRefresh() {
  if (sorteoAutoRefreshTimer) {
    clearInterval(sorteoAutoRefreshTimer);
  }

  sorteoAutoRefreshTimer = setInterval(async () => {
    if (document.hidden || redirectingToLiveRoom) return;

    await cargarSorteo({ silent: true });
    await cargarMisNumerosDelSorteo();
  }, SORTEO_AUTO_REFRESH_MS);
}

if (btnChatOnline && sorteoId) {
  btnChatOnline.addEventListener('click', () => {
    goToLiveRoom({ focusChat: true, reason: 'manual_chat_entry' });
  });
}

if (btnPostLive && sorteoId) {
  btnPostLive.addEventListener('click', () => {
    goToLiveRoom({ focusChat: true, reason: 'post_confirm_chat_entry' });
  });
}

// --- helpers ---
function mostrarToast(msg) {
  if (!toast) {
    alert(msg);
    return;
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 200);
  }, 2500);
}

function normalizeReferralAlias(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function formatReferralIdentifierLabel(value) {
  const normalized = normalizeReferralAlias(value);
  if (!normalized) return '';
  return /^\d+$/.test(normalized) ? `ID ${normalized}` : `@${normalized}`;
}

function formatLiveReferralRules(rules = []) {
  if (!Array.isArray(rules) || !rules.length) {
    return 'Si vienes invitado por alguien, escribe aqui su ID o alias antes de confirmar el pago.';
  }

  const summary = rules
    .slice()
    .sort((a, b) => Number(a.minimo_referidos || 0) - Number(b.minimo_referidos || 0))
    .slice(0, 3)
    .map((rule) => {
      const minimo = Number(rule.minimo_referidos || 0);
      const monto = Number(rule.recompensa_monto || 0);
      const money = monto > 0 ? `$${monto.toLocaleString('es-CO')}` : 'sin monto';
      return `${minimo} referidos: ${money}`;
    })
    .join(' · ');

  return summary || 'Si vienes invitado por alguien, escribe aqui su ID o alias antes de confirmar el pago.';
}

function renderLiveReferralCard() {
  if (!liveReferralCard || !inputReferralAlias || !liveReferralHint) return;

  const isLive = sorteoActual?.modalidad === 'live';
  liveReferralCard.classList.toggle('hidden', !isLive);
  if (!isLive) return;

  if (referidoAliasParam && !inputReferralAlias.value.trim()) {
    inputReferralAlias.value = referidoAliasParam;
  }

  if (liveReferralBadge) {
    liveReferralBadge.textContent = Array.isArray(sorteoActual?.live_referral_rules)
      ? `${sorteoActual.live_referral_rules.length} reglas`
      : 'LIVE';
  }

  liveReferralHint.textContent = formatLiveReferralRules(sorteoActual?.live_referral_rules || []);
}

function getNumeroPadding() {
  const total = Number(sorteoActual?.cantidad_numeros || 0);
  return total >= 100 ? 3 : 2;
}

function formatearNumero(numero) {
  return `#${String(numero).padStart(getNumeroPadding(), '0')}`;
}

function actualizarResumen() {
  const total = seleccionados.length * precioNumero;

  if (seleccionados.length === 0) {
    resumenNumeros.textContent = 'Ninguno todavía';
    resumenTotal.textContent = '$0';
  } else {
    resumenNumeros.textContent = seleccionados.map(formatearNumero).join(', ');
    resumenTotal.textContent = `$${total.toLocaleString('es-CO')}`;
  }

  if (paymentSelectedNumbers) {
    paymentSelectedNumbers.textContent = seleccionados.length
      ? seleccionados.map(formatearNumero).join(', ')
      : 'Sin seleccionar';
  }

  if (paymentSelectedCount) {
    paymentSelectedCount.textContent = seleccionados.length
      ? `${seleccionados.length} numero${seleccionados.length === 1 ? '' : 's'}`
      : '0 numero';
  }

  if (paymentSelectedTotal) {
    paymentSelectedTotal.textContent = `$${total.toLocaleString('es-CO')}`;
  }

  actualizarEstadoConfirmar();
  aplicarMetodoPagoUI(pagoMetodoActual);
}

function scrollToPaymentStep() {
  if (!paymentStepAccordion) return;
  window.requestAnimationFrame(() => {
    paymentStepAccordion.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
}

function openPaymentStep({ scroll = true } = {}) {
  if (!paymentStepAccordion) return;
  paymentStepAccordion.open = true;
  if (numbersStepAccordion) {
    numbersStepAccordion.open = false;
  }
  if (scroll) {
    scrollToPaymentStep();
  }
  if (paymentMethodSelect && !pagoMetodoActual) {
    window.setTimeout(() => {
      paymentMethodSelect.focus({ preventScroll: true });
    }, 180);
  }
}

// habilitar/deshabilitar botón confirmar según selección y comprobante
function actualizarEstadoConfirmar() {
  if (!btnConfirmar) return;

  // Si el sorteo está lleno, se mantiene bloqueado
  if (sorteoActual && (sorteoActual.estado === 'lleno')) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Cupo lleno';
    return;
  }

  const file = inputComprobante?.files?.[0];
  const pagadorNombre = (inputPagadorNombre?.value || '').trim();
  const pagadorTelefono = (inputPagadorTelefono?.value || '').replace(/\D+/g, '');
  const pagadorOk = pagadorNombre.length >= 3 && pagadorTelefono.length >= 10;
  const metodoSeleccionado = Boolean(pagoMetodoActual);
  const listo = (seleccionados.length > 0) && metodoSeleccionado && (!!file || pagadorOk);

  btnConfirmar.disabled = !listo;
  if (seleccionados.length === 0) {
    btnConfirmar.textContent = 'Selecciona un numero para continuar';
    return;
  }

  if (!metodoSeleccionado) {
    btnConfirmar.textContent = 'Selecciona tipo de cuenta';
    return;
  }

  btnConfirmar.textContent = listo
    ? 'Confirmar participación'
    : 'Sube comprobante o confirma con nombre y celular';
}


function renderNumeros() {
  if (!sorteoActual || !gridNumeros) return;

  const total = sorteoActual.cantidad_numeros;
  gridNumeros.innerHTML = '';

  for (let n = 1; n <= total; n++) {
    const ocupado = numerosOcupados.includes(n);
    const div = document.createElement('div');

    // clase base de la bolita
    div.className = 'numero-bola';
    // Formato visual: 001, 002... si >= 100; sino 01, 02...
    const padding = total >= 100 ? 3 : 2;
    div.textContent = String(n).padStart(padding, '0');
    div.dataset.numero = n;

    if (ocupado) {
      // estilo de número ya vendido / ocupado
      div.classList.add('numero-bola--ocupado');
      div.setAttribute('aria-disabled', 'true');
    } else {
      // si ese número ya está en "seleccionados", marcarlo
      if (seleccionados.includes(n)) {
        div.classList.add('numero-bola--seleccionado');
      }

      div.addEventListener('click', () => toggleNumero(n, div));
    }

    gridNumeros.appendChild(div);
  }

  actualizarBloqueoPorMaximo();

}


function actualizarBloqueoPorMaximo() {
  if (!gridNumeros) return;

  const maxAlcanzado = seleccionados.length >= MAX_NUMEROS_POR_COMPRA;

  // Recorremos todos los números pintados
  gridNumeros.querySelectorAll('.numero-bola').forEach((el) => {
    const n = Number(el.dataset.numero);

    const ocupado = el.classList.contains('numero-bola--ocupado');
    const seleccionado = el.classList.contains('numero-bola--seleccionado');

    // Si está ocupado, no tocamos nada
    if (ocupado) return;

    // Si se alcanzó el max, apagamos los NO seleccionados
    if (maxAlcanzado && !seleccionado) {
      el.classList.add('numero-bola--bloqueado');
      el.setAttribute('aria-disabled', 'true');
    } else {
      el.classList.remove('numero-bola--bloqueado');
      el.removeAttribute('aria-disabled');
    }
  });
}


function obtenerLinkNequiSeguro(sorteoIdValue) {
  const raw = NEQUI_PAYMENT_LINKS?.[String(sorteoIdValue)];
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const hostPermitido = parsed.hostname === 'checkout.nequi.wompi.co';
    const pathValido = parsed.pathname.startsWith('/l/');
    if (parsed.protocol !== 'https:' || !hostPermitido || !pathValido) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function construirQrDesdeLink(linkSeguro) {
  const encoded = encodeURIComponent(linkSeguro);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}`;
}

function obtenerLlaveNequi(sorteoIdValue) {
  const map = window.NEQUI_KEYS || {};
  const byId = map?.[String(sorteoIdValue)] || map?.[sorteoIdValue];
  return byId || window.NEQUI_KEY || '';
}

function obtenerNumeroNequi() {
  return (window.NEQUI_PHONE || window.NEQUI_NUMBER || '3017680062').toString();
}

function obtenerTitularNequi(sorteoIdValue) {
  const map = window.NEQUI_HOLDER_NAMES || {};
  const byId = map?.[String(sorteoIdValue)] || map?.[sorteoIdValue];
  return byId || window.NEQUI_HOLDER_NAME || 'MATHOME JENNY PORRAS';
}

function getMetodosPagoDisponibles() {
  const metodos = [];
  const hasQr = Boolean(obtenerLinkNequiSeguro(sorteoId) || imgQrNequiFallback);
  const hasKey = Boolean(obtenerLlaveNequi(sorteoId));
  const hasNumero = Boolean(obtenerNumeroNequi());

  if (hasQr) {
    metodos.push({ value: 'nequi_qr', label: 'QR Nequi' });
  }
  if (hasKey) {
    metodos.push({ value: 'nequi_key', label: 'Llave Nequi' });
  }
  if (hasNumero) {
    metodos.push({ value: 'nequi_numero', label: 'Numero Nequi' });
  }

  return metodos;
}

function renderMetodoPagoOptions() {
  if (!paymentMethodSelect) return;

  const metodos = getMetodosPagoDisponibles();
  const current = pagoMetodoActual;

  if (!metodos.length) {
    paymentMethodSelect.innerHTML = '<option value="">No hay datos de pago configurados</option>';
    paymentMethodSelect.disabled = true;
    pagoMetodoActual = '';
    aplicarMetodoPagoUI('');
    actualizarEstadoConfirmar();
    return;
  }

  paymentMethodSelect.disabled = false;
  paymentMethodSelect.innerHTML = [
    '<option value="">Selecciona una opcion</option>',
    ...metodos.map((metodo) => `<option value="${metodo.value}">${metodo.label}</option>`)
  ].join('');

  if (metodos.some((metodo) => metodo.value === current)) {
    paymentMethodSelect.value = current;
    pagoMetodoActual = current;
  } else {
    paymentMethodSelect.value = '';
    pagoMetodoActual = '';
  }

  aplicarMetodoPagoUI(pagoMetodoActual);
  actualizarEstadoConfirmar();
}

async function copiarTexto(texto, mensajeOk) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast(mensajeOk);
  } catch {
    mostrarToast('No se pudo copiar. Copia manualmente.');
  }
}

function aplicarMetodoPagoUI(metodo) {
  const usarQr = metodo === 'nequi_qr';
  const usarLlave = metodo === 'nequi_key';
  const usarNumero = metodo === 'nequi_numero';
  const holderName = obtenerTitularNequi(sorteoId);
  const totalSeleccion = seleccionados.length * precioNumero;
  const resumenSeleccion = seleccionados.length
    ? `Total a pagar: $${totalSeleccion.toLocaleString('es-CO')}`
    : 'Selecciona tu numero y luego realiza el pago.';

  if (paymentPreviewCard) paymentPreviewCard.classList.toggle('is-empty', !metodo);
  if (paymentPreviewEmpty) paymentPreviewEmpty.classList.toggle('hidden', Boolean(metodo));
  if (paymentPreviewContent) paymentPreviewContent.classList.toggle('hidden', !metodo);
  if (paymentQrPanel) paymentQrPanel.classList.toggle('hidden', !usarQr);
  if (paymentKeyPanel) paymentKeyPanel.classList.toggle('hidden', !usarLlave);
  if (paymentNumberPanel) paymentNumberPanel.classList.toggle('hidden', !usarNumero);

  if (!metodo) {
    if (paymentPreviewBadge) paymentPreviewBadge.textContent = 'INFO';
    if (paymentPreviewTitle) paymentPreviewTitle.textContent = 'Datos de pago';
    if (paymentPreviewText) paymentPreviewText.textContent = 'Selecciona una opcion para ver sus datos.';
    return;
  }

  if (usarQr) {
    linkSeguroActual = obtenerLinkNequiSeguro(sorteoId);
    if (imgQrNequi) {
      if (linkSeguroActual) {
        imgQrNequi.src = construirQrDesdeLink(linkSeguroActual);
        imgQrNequi.classList.remove('hidden');
      } else {
        imgQrNequi.classList.add('hidden');
      }
    }
    if (imgQrNequiFallback) {
      imgQrNequiFallback.classList.toggle('hidden', Boolean(linkSeguroActual));
    }
    if (btnPagarNequiLink) {
      btnPagarNequiLink.classList.toggle('hidden', !linkSeguroActual);
      btnPagarNequiLink.onclick = linkSeguroActual
        ? () => window.open(linkSeguroActual, '_blank', 'noopener,noreferrer')
        : null;
    }
    if (paymentPreviewBadge) paymentPreviewBadge.textContent = 'QR';
    if (paymentPreviewTitle) paymentPreviewTitle.textContent = 'Escanea el QR Nequi';
    if (paymentPreviewText) paymentPreviewText.textContent = resumenSeleccion;
  }

  if (usarLlave) {
    const key = obtenerLlaveNequi(sorteoId);
    if (nequiKeyText) nequiKeyText.textContent = key || 'Llave no configurada';
    if (paymentPreviewBadge) paymentPreviewBadge.textContent = 'LLAVE';
    if (paymentPreviewTitle) paymentPreviewTitle.textContent = 'Paga con la llave';
    if (paymentPreviewText) paymentPreviewText.textContent = `${resumenSeleccion} Verifica la llave antes de transferir.`;
  }

  if (usarNumero) {
    const numero = obtenerNumeroNequi();
    if (nequiNumeroText) nequiNumeroText.textContent = numero || 'Numero no configurado';
    if (nequiHolderNameText) nequiHolderNameText.textContent = holderName;
    if (paymentPreviewBadge) paymentPreviewBadge.textContent = 'NUMERO';
    if (paymentPreviewTitle) paymentPreviewTitle.textContent = 'Paga al numero registrado';
    if (paymentPreviewText) paymentPreviewText.textContent = `${resumenSeleccion} Confirma que el titular sea ${holderName}.`;
  }
}


function toggleNumero(numero, el) {
  // por seguridad: si está ocupado, no hacer nada
  if (el.classList.contains('numero-bola--ocupado')) return;

  const idx = seleccionados.indexOf(numero);

  if (idx >= 0) {
    // quitar selección
    seleccionados.splice(idx, 1);
    el.classList.remove('numero-bola--seleccionado');
  } else {
    if (seleccionados.length >= MAX_NUMEROS_POR_COMPRA) {
      mostrarToast(`Máximo ${MAX_NUMEROS_POR_COMPRA} número por compra.`);
      return;
    }
    seleccionados.push(numero);
    el.classList.add('numero-bola--seleccionado');
  }

  actualizarResumen();

  if (seleccionados.length > 0) {
    openPaymentStep();
  }
}


// helper para convertir un File a base64 (data URL)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // "data:image/png;base64,AAAA..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- cargar mis números en esta ronda ---
async function cargarMisNumerosDelSorteo() {
  const token = localStorage.getItem('token');
  const user = typeof window.getAuthUser === 'function'
    ? await window.getAuthUser()
    : null;

  if (!token || !user?.id) return;
  if (!sorteoId) return;

  if (!misNumerosEnSorteoCard || !misNumerosEnSorteoTexto || !misNumerosEnSorteoChips) return;

  try {
    const res = await fetch(
      `${API_URL}/api/participante/mis-numeros?sorteoId=${encodeURIComponent(sorteoId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return;

    const data = await res.json();
    const nums = Array.isArray(data?.numeros) ? data.numeros : [];
    const liveReady = isLiveRoomReady();

    if (nums.length === 0) {
      if (misNumerosEnSorteoCard) misNumerosEnSorteoCard.style.display = 'none';
      if (estadoNoParticipante) estadoNoParticipante.style.display = 'block';
      if (btnMisNumeros) btnMisNumeros.classList.add('hidden');
      updateQuickAccessButtons({ hasApprovedNumbers: false });
      return;
    }

    if (estadoNoParticipante) estadoNoParticipante.style.display = 'none';
    if (misNumerosEnSorteoCard) misNumerosEnSorteoCard.style.display = 'block';
    if (btnMisNumeros) btnMisNumeros.classList.remove('hidden');
    updateQuickAccessButtons({ hasApprovedNumbers: true });
    nums.sort((a, b) => Number(a) - Number(b));

    misNumerosEnSorteoTexto.textContent = `Aprobados: ${nums.length} número(s)`;

    misNumerosEnSorteoChips.innerHTML = nums.map(n => `
      <span class="chip-numero">#${n}</span>
    `).join('');

    if (comprarOtroNumero && !liveReady) {
      return;
    }

    if (liveReady) {
      goToLiveRoom({
        focusChat: true,
        replace: true,
        reason: 'approved_participant_redirect',
      });
    }

  } catch (err) {
  }
}



// --- cargar sorteo desde backend ---
async function cargarSorteo({ silent = false } = {}) {
  const token = localStorage.getItem('token');
  const user = typeof window.getAuthUser === 'function'
    ? await window.getAuthUser()
    : null;

  if (!token || !user?.id) {
    location.href = '../index.html';
    return;
  }

  if (!sorteoId) {
    tituloSorteo.textContent = 'Ronda no especificada';
    subtituloSorteo.textContent = 'Vuelve al panel y entra desde una ronda válida.';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/sorteos/${sorteoId}`);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 404 && !sorteoRemovedHandled) {
        sorteoRemovedHandled = true;
        mostrarToast('Esta ronda ya no está disponible.');
        setTimeout(() => {
          location.replace('dashboard.html');
        }, 900);
        return;
      }

      tituloSorteo.textContent = data.error || 'Error al cargar la ronda';
      return;
    }

    sorteoActual = data;
    precioNumero = Number(sorteoActual.precio_numero) || 0;
    numerosOcupados = Array.isArray(sorteoActual.numeros_ocupados)
      ? sorteoActual.numeros_ocupados
      : [];
    updateQuickAccessButtons({ hasApprovedNumbers: misNumerosEnSorteoCard?.style.display !== 'none' });

    // Hero
    tituloSorteo.textContent = sorteoActual.descripcion;
    tituloPremio.textContent = 'Ronda: ' + sorteoActual.descripcion;
    textoPremio.textContent = sorteoActual.premio;
    textoPrecio.textContent = `$${precioNumero.toLocaleString('es-CO')}`;
    textoCantidad.textContent = sorteoActual.cantidad_numeros;

    const ocupados = numerosOcupados.length;
    const total = sorteoActual.cantidad_numeros;
    const faltan = total - ocupados;
    const porcentaje = Math.min(100, Math.round((ocupados / total) * 100));

    if (progressFill) {
      progressFill.style.width = `${porcentaje}%`;
    }

    if (textoProgreso) {
      textoProgreso.textContent = `${ocupados} / ${total} vendidos`;
    }

    if (textoCupos) {
      if (faltan <= 0) {
        textoCupos.innerHTML = 'Ronda completa - lista para resultado en vivo';
      } else {
        textoCupos.innerHTML = `Quedan <strong>${faltan}</strong> cupos disponibles`;
      }
    }

    if (faltan <= 0 || sorteoActual.estado === 'lleno') {
      subtituloSorteo.textContent =
        'Esta ronda ya está completa. El resultado en vivo puede activarse en cualquier momento.';
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        await cargarMisNumerosDelSorteo();
        btnConfirmar.textContent = 'Cupo lleno';
      }
    }

    renderLiveReferralCard();
    renderNumeros();
    actualizarResumen();

    // El chat no se monta aquí. La entrada única es la ruleta en vivo.

  } catch (err) {
    tituloSorteo.textContent = 'Error de conexión al cargar el sorteo.';
  }
}

// --- manejar comprobante ---
if (inputComprobante) {
  let _currentObjectUrl = null;
  inputComprobante.addEventListener('change', () => {
    const file = inputComprobante.files[0];
    // limpiar url anterior si había
    if (_currentObjectUrl) {
      URL.revokeObjectURL(_currentObjectUrl);
      _currentObjectUrl = null;
    }

    if (!file) {
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      if (paymentUploadFileText) {
        paymentUploadFileText.textContent = 'o haz clic para seleccionar';
      }
      actualizarEstadoConfirmar();
      return;
    }


    // Validaciones básicas: tipo y tamaño
    if (!file.type || !file.type.startsWith('image/')) {
      mostrarToast('Selecciona un archivo de imagen (jpg, png, ...).');
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      if (paymentUploadFileText) {
        paymentUploadFileText.textContent = 'o haz clic para seleccionar';
      }
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      mostrarToast('El archivo es demasiado grande. Máx 2 MB.');
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      if (paymentUploadFileText) {
        paymentUploadFileText.textContent = 'o haz clic para seleccionar';
      }
      return;
    }


    const url = URL.createObjectURL(file);
    _currentObjectUrl = url;
    imgPreview.src = url;
    previewComprobante.classList.remove('oculto');
    if (paymentUploadFileText) {
      paymentUploadFileText.textContent = file.name;
    }
    actualizarEstadoConfirmar();

  });
}

if (sinComprobante) {
  sinComprobante.addEventListener('change', () => {
    const activo = sinComprobante.checked;
    if (pagadorDatos) pagadorDatos.classList.toggle('oculto', !activo);
    if (inputComprobante) {
      inputComprobante.disabled = activo;
      if (paymentUploadDropzone) {
        paymentUploadDropzone.classList.toggle('is-disabled', activo);
      }
      if (activo) {
        inputComprobante.value = '';
        if (previewComprobante) previewComprobante.classList.add('oculto');
        if (imgPreview) imgPreview.src = '';
        if (paymentUploadFileText) {
          paymentUploadFileText.textContent = 'Usa nombre y celular para validar el pago';
        }
      } else if (paymentUploadFileText) {
        paymentUploadFileText.textContent = 'o haz clic para seleccionar';
      }
    }
    actualizarEstadoConfirmar();
  });
}

if (inputPagadorNombre) {
  inputPagadorNombre.addEventListener('input', actualizarEstadoConfirmar);
}
if (inputPagadorTelefono) {
  inputPagadorTelefono.addEventListener('input', actualizarEstadoConfirmar);
}

if (paymentMethodSelect) {
  paymentMethodSelect.addEventListener('change', () => {
    pagoMetodoActual = paymentMethodSelect.value || '';
    aplicarMetodoPagoUI(pagoMetodoActual);
    actualizarEstadoConfirmar();
  });
}

if (btnCopyNequiKey) {
  btnCopyNequiKey.addEventListener('click', async () => {
    const key = (nequiKeyText?.textContent || '').trim();
    if (!key) {
      mostrarToast('No hay llave disponible para copiar.');
      return;
    }
    await copiarTexto(key, 'Llave copiada');
  });
}

if (btnCopyNequiNumero) {
  btnCopyNequiNumero.addEventListener('click', async () => {
    const numero = (nequiNumeroText?.textContent || '').trim();
    if (!numero) {
      mostrarToast('No hay numero disponible para copiar.');
      return;
    }
    await copiarTexto(numero, 'Numero copiado');
  });
}

if (imgQrNequi && imgQrNequiFallback) {
  imgQrNequi.addEventListener('error', () => {
    imgQrNequi.classList.add('hidden');
    imgQrNequiFallback.classList.remove('hidden');
  });
}

// --- confirmar participación ---
if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const user = typeof window.getAuthUser === 'function'
      ? await window.getAuthUser()
      : null;

    if (!token || !user?.id) {
      location.href = '../index.html';
      return;
    }

    if (!sorteoActual) {
      mostrarToast('La ronda no está lista todavía.');
      return;
    }

    if (seleccionados.length === 0) {
      mostrarToast('Selecciona al menos un número antes de confirmar.');
      return;
    }

    if (!pagoMetodoActual) {
      mostrarToast('Selecciona primero el tipo de cuenta.');
      return;
    }

    const file = inputComprobante?.files?.[0];
    const pagadorNombre = (inputPagadorNombre?.value || '').trim();
    const pagadorTelefono = (inputPagadorTelefono?.value || '').replace(/\D+/g, '');
    const pagadorOk = pagadorNombre.length >= 3 && pagadorTelefono.length >= 10;
    const metodo = pagoMetodoActual;

    if (!file && !pagadorOk) {
      mostrarToast('Sube comprobante o confirma con nombre y celular.');
      return;
    }

    if (file) {
      // Validaciones duplicadas por seguridad antes de enviar
      if (!file.type || !file.type.startsWith('image/')) {
        mostrarToast('El comprobante debe ser una imagen (jpg, png, ...).');
        return;
      }
      const maxBytes = 2 * 1024 * 1024; // 2 MB

      if (file.size > maxBytes) {
        mostrarToast('El comprobante es demasiado grande. Máx 2 MB.');
        return;
      }
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Enviando...';

    try {
      // 1️⃣ convertir archivo a base64 (data URL)
      const base64 = file ? await fileToBase64(file) : null;
      const referidoAlias = normalizeReferralAlias(inputReferralAlias?.value || '');

      // 2️⃣ armar body JSON como lo espera el backend
      const body = {
        sorteo_id: Number(sorteoId),
        numeros: seleccionados,
        comprobante: base64,
        pagador_nombre: pagadorNombre || null,
        pagador_telefono: pagadorTelefono || null,
        pago_metodo: metodo,
        referido_alias: referidoAlias || null,
      };

      const res = await fetch(`${API_URL}/api/participante/guardar-numeros`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarToast(data.error || data.message || 'Error al guardar tu participación.');
        actualizarEstadoConfirmar();
        return;
      }

      const referidoGuardado = data?.referido?.registrado && data?.referido?.referidor?.alias;
      const successMessage = referidoGuardado
        ? `Listo. Tu participacion quedo pendiente y el referido ${formatReferralIdentifierLabel(data.referido.referidor.alias)} fue guardado.`
        : 'Listo. Tu participacion quedo registrada como pendiente.';
      mostrarToast(successMessage);
      if (Array.isArray(data?.warnings) && data.warnings.length) {
        window.setTimeout(() => {
          mostrarToast(data.warnings[0]);
        }, 1800);
      }

      // reset selección
      seleccionados = [];
      pagoMetodoActual = '';
      if (paymentMethodSelect) paymentMethodSelect.value = '';
      if (inputComprobante) inputComprobante.value = '';
      if (previewComprobante) previewComprobante.classList.add('oculto');
      if (imgPreview) imgPreview.src = '';
      if (paymentUploadFileText) {
        paymentUploadFileText.textContent = 'o haz clic para seleccionar';
      }
      if (paymentUploadDropzone) {
        paymentUploadDropzone.classList.remove('is-disabled');
      }
      if (sinComprobante) sinComprobante.checked = false;
      if (pagadorDatos) pagadorDatos.classList.add('oculto');
      if (inputPagadorNombre) inputPagadorNombre.value = '';
      if (inputPagadorTelefono) inputPagadorTelefono.value = '';
      actualizarResumen();

      // Opcional: recargar ocupados
      await cargarSorteo();

      setTimeout(() => {
        location.href = 'mis-numeros.html';
      }, 1200);
    } catch (err) {
      mostrarToast('Error de conexión al enviar tu participación.');
      actualizarEstadoConfirmar();
    }
  });
}

// --- init ---
document.addEventListener('DOMContentLoaded', () => {
  if (paymentStepAccordion) {
    paymentStepAccordion.addEventListener('toggle', () => {
      if (paymentStepAccordion.open) {
        scrollToPaymentStep();
      }
    });
  }

  renderMetodoPagoOptions();
  cargarSorteo();
  cargarMisNumerosDelSorteo();
  startSorteoAutoRefresh();
});












