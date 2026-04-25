// assets/js/participante/sorteo-detalle.js

const API_URL = window.API_URL || ''; // viene de config.js
// La conversación oficial vive dentro de ruleta-live.html.

// obtener sorteoId de la URL
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('id');
const comprarOtroNumero = ['1', 'true', 'si'].includes(
  String(params.get('comprar') || '').toLowerCase()
);

const SOCIOS_PROMO_OPEN_DELAY_MS = 180;
const SOCIOS_PROMO_GUARD_MS = 450;

const tituloSorteo = document.getElementById('tituloSorteo');
const subtituloSorteo = document.getElementById('subtituloSorteo');
const tituloPremio = document.getElementById('tituloPremio');
const textoPremio = document.getElementById('textoPremio');
const textoPrecio = document.getElementById('textoPrecio');
const textoCantidad = document.getElementById('textoCantidad');
const textoProgreso = document.getElementById('textoProgreso');
const textoCupos = document.getElementById('textoCupos');
const progressFill = document.getElementById('progressFill');
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
let inputReferidoCodigo = document.getElementById('inputReferidoCodigo');
let referralEntryCard = document.getElementById('referralEntryCard');
const postConfirmActions = document.getElementById('postConfirmActions');
const btnPostLive = document.getElementById('btnPostLive');
const paymentStepAccordion = document.getElementById('paymentStepAccordion');
let sociosPromoModal = document.getElementById('sociosPromoModal');
let btnCerrarSociosPromo = document.getElementById('btnCerrarSociosPromo');

const SORTEO_AUTO_REFRESH_MS = 12000;

let sorteoActual = null;
let numerosOcupados = [];
let precioNumero = 0;
const NEQUI_PAYMENT_LINKS = window.NEQUI_PAYMENT_LINKS || {};
let pagoMetodoActual = '';
let linkSeguroActual = null;
let redirectingToLiveRoom = false;
let sorteoAutoRefreshTimer = null;
let sorteoRemovedHandled = false;
let approvedNumbersInitialized = false;
let previousApprovedNumbers = new Set();
const referralCodeFromUrl = String(params.get('ref') || '').trim();
let sociosPromoOpenedAt = 0;
let sociosPromoAutoOpened = false;
let sociosPromoModalReady = false;

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
      labelEl.textContent = liveReady ? 'Sala en vivo' : 'Mis participaciones';
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

function isLiveReferralEnabled(sorteo = sorteoActual) {
  if (!sorteo) return false;

  if (typeof sorteo?.referral_program_enabled === 'boolean') {
    return sorteo.referral_program_enabled;
  }

  return String(sorteo?.modalidad || '').trim().toLowerCase() === 'live';
}

function destroyReferralExperience() {
  if (inputReferidoCodigo) {
    inputReferidoCodigo.value = '';
  }

  if (referralEntryCard?.isConnected) {
    referralEntryCard.remove();
  }
  referralEntryCard = null;
  inputReferidoCodigo = null;

  if (sociosPromoModal) {
    sociosPromoModal.classList.add('hidden');
    sociosPromoModal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('socios-promo-open');

  if (sociosPromoModal?.isConnected) {
    sociosPromoModal.remove();
  }
  sociosPromoModal = null;
  btnCerrarSociosPromo = null;
  sociosPromoAutoOpened = false;
  sociosPromoOpenedAt = 0;
  sociosPromoModalReady = false;
}

function syncReferralExperienceVisibility() {
  const enabled = isLiveReferralEnabled();

  if (!enabled) {
    destroyReferralExperience();
    return false;
  }

  if (referralEntryCard) {
    referralEntryCard.hidden = false;
  }

  return enabled;
}

function shouldShowSociosPromo() {
  return Boolean(sociosPromoModal) && isLiveReferralEnabled() && !sociosPromoAutoOpened;
}

function closeSociosPromo() {
  if (!sociosPromoModal) return;
  if (Date.now() - sociosPromoOpenedAt < SOCIOS_PROMO_GUARD_MS) return;

  sociosPromoModal.classList.add('hidden');
  sociosPromoModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('socios-promo-open');
}

function openSociosPromo() {
  if (!sociosPromoModal) return;

  sociosPromoOpenedAt = Date.now();
  sociosPromoModal.classList.remove('hidden');
  sociosPromoModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('socios-promo-open');
  window.setTimeout(() => btnCerrarSociosPromo?.focus({ preventScroll: true }), 60);
}

function initSociosPromoModal() {
  if (!sociosPromoModal || sociosPromoModalReady) return;
  sociosPromoModalReady = true;

  sociosPromoModal.querySelectorAll('[data-socios-promo-close]').forEach((element) => {
    element.addEventListener('click', () => closeSociosPromo());
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape'
      && sociosPromoModal
      && !sociosPromoModal.classList.contains('hidden')
    ) {
      closeSociosPromo();
    }
  });
}

function getCantidadParticipacionesCompra() {
  if (!sorteoActual || sorteoActual.estado === 'lleno') return 0;
  return 1;
}

function actualizarResumen() {
  const cantidad = getCantidadParticipacionesCompra();
  const total = cantidad * precioNumero;

  if (paymentSelectedNumbers) {
    paymentSelectedNumbers.textContent = cantidad ? 'Cupo automático' : 'Sin cupo disponible';
  }

  if (paymentSelectedCount) {
    paymentSelectedCount.textContent = cantidad
      ? '1 participación'
      : '0 participaciones';
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
  const cantidad = getCantidadParticipacionesCompra();
  const listo = cantidad > 0 && metodoSeleccionado && (!!file || pagadorOk);

  btnConfirmar.disabled = !listo;
  if (cantidad === 0) {
    btnConfirmar.textContent = 'Cupo no disponible';
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
  return (window.NEQUI_PHONE || window.NEQUI_NUMBER || '3045538465').toString();
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
  const cantidad = getCantidadParticipacionesCompra();
  const totalSeleccion = cantidad * precioNumero;
  const resumenSeleccion = cantidad
    ? `Total a pagar: $${totalSeleccion.toLocaleString('es-CO')}`
    : 'La ronda no tiene cupos disponibles en este momento.';

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
    const nextApprovedNumbers = new Set(
      nums
        .map((numero) => Number(numero))
        .filter((numero) => Number.isFinite(numero))
    );
    const nuevosAprobados = approvedNumbersInitialized
      ? Array.from(nextApprovedNumbers).filter((numero) => !previousApprovedNumbers.has(numero))
      : [];

    previousApprovedNumbers = nextApprovedNumbers;
    approvedNumbersInitialized = true;

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

    misNumerosEnSorteoTexto.textContent =
      nums.length === 1
        ? 'Tienes 1 participación aprobada en esta ronda.'
        : `Tienes ${nums.length} participaciones aprobadas en esta ronda.`;

    misNumerosEnSorteoChips.innerHTML = nums.map((_, index) => `
      <span class="chip-numero">Participación ${index + 1}</span>
    `).join('');

    if (nuevosAprobados.length) {
      const avisoAprobacion =
        nuevosAprobados.length === 1
          ? 'Tu pago ya fue aprobado.'
          : `Se aprobaron ${nuevosAprobados.length} participaciones en esta ronda.`;
      mostrarToast(liveReady ? `${avisoAprobacion} Entrando al vivo...` : avisoAprobacion);
    }

    if (comprarOtroNumero && !liveReady) {
      return;
    }

    if (liveReady) {
      const goLive = () =>
        goToLiveRoom({
          focusChat: true,
          replace: true,
          reason: 'approved_participant_redirect',
        });

      if (nuevosAprobados.length) {
        setTimeout(goLive, 900);
      } else {
        goLive();
      }
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
    location.href = '../login.html';
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
    const referralEnabled = syncReferralExperienceVisibility();
    if (referralEnabled) {
      initSociosPromoModal();
      if (inputReferidoCodigo && referralCodeFromUrl) {
        inputReferidoCodigo.value = referralCodeFromUrl.replace(/^@+/, '').trim();
      }
    }
    updateQuickAccessButtons({ hasApprovedNumbers: misNumerosEnSorteoCard?.style.display !== 'none' });

    // Hero
    tituloSorteo.textContent = sorteoActual.descripcion;
    tituloPremio.textContent = 'Ronda: ' + sorteoActual.descripcion;
    textoPremio.textContent = sorteoActual.premio;
    textoPrecio.textContent = `$${precioNumero.toLocaleString('es-CO')}`;
    textoCantidad.textContent = 'Cupo automático al confirmar pago';

    const ocupados = numerosOcupados.length;
    const total = sorteoActual.cantidad_numeros;
    const faltan = total - ocupados;
    const porcentaje = Math.min(100, Math.round((ocupados / total) * 100));

    if (progressFill) {
      progressFill.style.width = `${porcentaje}%`;
    }

    if (textoProgreso) {
      textoProgreso.textContent = 'La ronda avanza con cada pago aprobado';
    }

    if (textoCupos) {
      if (faltan <= 0) {
        textoCupos.innerHTML = 'Ronda completa - lista para resultado en vivo';
      } else {
        textoCupos.innerHTML = 'Asegura tu participación y comparte la ronda con tus amigos';
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

    actualizarResumen();

    if (referralEnabled && shouldShowSociosPromo()) {
      sociosPromoAutoOpened = true;
      window.setTimeout(() => {
        if (isLiveReferralEnabled()) {
          openSociosPromo();
        }
      }, SOCIOS_PROMO_OPEN_DELAY_MS);
    }

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
      location.href = '../login.html';
      return;
    }

    if (!sorteoActual) {
      mostrarToast('La ronda no está lista todavía.');
      return;
    }

    if (getCantidadParticipacionesCompra() === 0) {
      mostrarToast('Esta ronda ya no tiene cupos disponibles.');
      return;
    }

    if (!pagoMetodoActual) {
      mostrarToast('Selecciona primero el tipo de cuenta.');
      return;
    }

    const file = inputComprobante?.files?.[0];
    const pagadorNombre = (inputPagadorNombre?.value || '').trim();
    const pagadorTelefono = (inputPagadorTelefono?.value || '').replace(/\D+/g, '');
    const referidoCodigo = isLiveReferralEnabled()
      ? (inputReferidoCodigo?.value || '').trim()
      : '';
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
      // 2️⃣ armar body JSON como lo espera el backend
      const body = {
        sorteo_id: Number(sorteoId),
        comprobante: base64,
        pagador_nombre: pagadorNombre || null,
        pagador_telefono: pagadorTelefono || null,
        pago_metodo: metodo,
        referido_codigo: referidoCodigo || null,
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

      mostrarToast('Listo. Tu participacion quedo registrada como pendiente.');
      if (Array.isArray(data?.warnings) && data.warnings.length) {
        window.setTimeout(() => {
          mostrarToast(data.warnings[0]);
        }, 1800);
      }

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
    if (inputReferidoCodigo) {
      inputReferidoCodigo.value = isLiveReferralEnabled() ? (referralCodeFromUrl || '') : '';
    }
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
  (async () => {
    const user = typeof window.requireAuthUser === 'function'
      ? await window.requireAuthUser({ redirectTo: '../login.html' })
      : null;
    const token = localStorage.getItem('token');

    if (!token || !user?.id) {
      return;
    }

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
  })();
});












