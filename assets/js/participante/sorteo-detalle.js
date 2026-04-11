// assets/js/participante/sorteo-detalle.js

const API_URL = window.API_URL || ''; // viene de config.js
// La conversación oficial vive dentro de ruleta-live.html.

// obtener sorteoId de la URL
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('id');

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

const inputComprobante = document.getElementById('inputComprobante');
const previewComprobante = document.getElementById('previewComprobante');
const imgPreview = document.getElementById('imgPreview');
const btnPagarNequiLink = document.getElementById('btnPagarNequiLink');
const imgQrNequi = document.getElementById('imgQrNequi');
const imgQrNequiFallback = document.getElementById('imgQrNequiFallback');
const textoQrNequi = document.getElementById('textoQrNequi');
const nequiKeyBlock = document.getElementById('nequiKeyBlock');
const nequiKeyText = document.getElementById('nequiKeyText');
const nequiKeyContent = document.getElementById('nequiKeyContent');
const btnToggleNequiKey = document.getElementById('btnToggleNequiKey');
const btnCopyNequiKey = document.getElementById('btnCopyNequiKey');
const nequiNumeroBlock = document.getElementById('nequiNumeroBlock');
const nequiNumeroText = document.getElementById('nequiNumeroText');
const btnCopyNequiNumero = document.getElementById('btnCopyNequiNumero');
const metodoBtns = Array.from(document.querySelectorAll('[data-pago-metodo]'));

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
const paymentFormAccordion = document.getElementById('paymentFormAccordion');


let sorteoActual = null;
let numerosOcupados = [];
let seleccionados = [];
let precioNumero = 0;
const NEQUI_PAYMENT_LINKS = window.NEQUI_PAYMENT_LINKS || {};
let pagoMetodoActual = 'nequi_qr';

if (maxNumerosTexto) maxNumerosTexto.textContent = MAX_NUMEROS_POR_COMPRA.toString();
function goToLiveRoom() {
  if (!sorteoId) return;
  location.href = `ruleta-live.html?id=${encodeURIComponent(sorteoId)}`;
}

if (btnChatOnline && sorteoId) {
  btnChatOnline.addEventListener('click', goToLiveRoom);
}

if (btnPostLive && sorteoId) {
  btnPostLive.addEventListener('click', goToLiveRoom);
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

function actualizarResumen() {
  if (seleccionados.length === 0) {
    resumenNumeros.textContent = 'Ninguno todavía';
    resumenTotal.textContent = '$0';
  } else {
    resumenNumeros.textContent = seleccionados.join(', ');
    const total = seleccionados.length * precioNumero;
    resumenTotal.textContent = `$${total.toLocaleString('es-CO')}`;
  }

  actualizarEstadoConfirmar();

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
  if (paymentFormAccordion) {
    paymentFormAccordion.open = true;
  }
  if (numbersStepAccordion) {
    numbersStepAccordion.open = false;
  }
  if (scroll) {
    scrollToPaymentStep();
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
  const listo = (seleccionados.length > 0) && (!!file || pagadorOk);

  btnConfirmar.disabled = !listo;
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

function configurarPagoNequiPorLink() {
  if (!btnPagarNequiLink || !imgQrNequi || !textoQrNequi || !sorteoId) return;

  const linkSeguro = obtenerLinkNequiSeguro(sorteoId);
  if (!linkSeguro) {
    btnPagarNequiLink.classList.add('hidden');
    imgQrNequi.classList.add('hidden');
    textoQrNequi.classList.add('hidden');
    if (imgQrNequiFallback) imgQrNequiFallback.classList.remove('hidden');
    return;
  }

  imgQrNequi.src = construirQrDesdeLink(linkSeguro);
  imgQrNequi.classList.remove('hidden');
  textoQrNequi.classList.remove('hidden');
  if (imgQrNequiFallback) imgQrNequiFallback.classList.add('hidden');
  btnPagarNequiLink.classList.remove('hidden');
  btnPagarNequiLink.addEventListener('click', () => {
    window.open(linkSeguro, '_blank', 'noopener,noreferrer');
  });
}

function obtenerLlaveNequi(sorteoIdValue) {
  const map = window.NEQUI_KEYS || {};
  const byId = map?.[String(sorteoIdValue)] || map?.[sorteoIdValue];
  return byId || window.NEQUI_KEY || '';
}

function configurarLlaveNequi() {
  if (!nequiKeyBlock || !nequiKeyText || !btnToggleNequiKey || !nequiKeyContent) return;
  if (!sorteoId) return;

  const key = obtenerLlaveNequi(sorteoId);
  if (!key) {
    nequiKeyBlock.classList.add('hidden');
    return;
  }

  nequiKeyText.textContent = key;
  nequiKeyBlock.classList.remove('hidden');
  nequiKeyContent.classList.add('hidden');
  btnToggleNequiKey.textContent = 'Mostrar llave';

  btnToggleNequiKey.addEventListener('click', () => {
    const hidden = nequiKeyContent.classList.contains('hidden');
    nequiKeyContent.classList.toggle('hidden');
    btnToggleNequiKey.textContent = hidden ? 'Ocultar llave' : 'Mostrar llave';
  });

  if (btnCopyNequiKey) {
    btnCopyNequiKey.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(key);
        mostrarToast('Llave copiada ✅');
      } catch {
        mostrarToast('No se pudo copiar. Copia manualmente.');
      }
    });
  }
}

function obtenerNumeroNequi() {
  return (window.NEQUI_PHONE || window.NEQUI_NUMBER || '3045538465').toString();
}

function configurarNumeroNequi() {
  if (!nequiNumeroBlock || !nequiNumeroText) return;
  const numero = obtenerNumeroNequi();

  if (!numero) {
    nequiNumeroBlock.classList.add('hidden');
    return;
  }

  nequiNumeroText.textContent = numero;
  nequiNumeroBlock.classList.add('hidden');

  if (btnCopyNequiNumero) {
    btnCopyNequiNumero.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(numero);
        mostrarToast('Número copiado ✅');
      } catch {
        mostrarToast('No se pudo copiar. Copia manualmente.');
      }
    });
  }
}

function aplicarMetodoPagoUI(metodo) {
  const usarQr = metodo === 'nequi_qr';
  const usarLlave = metodo === 'nequi_key';
  const usarNumero = metodo === 'nequi_numero';
  const linkSeguro = usarQr ? obtenerLinkNequiSeguro(sorteoId) : null;

  if (imgQrNequi) imgQrNequi.classList.toggle('hidden', !usarQr || !linkSeguro);
  if (imgQrNequiFallback) imgQrNequiFallback.classList.toggle('hidden', !usarQr || !!linkSeguro);
  if (textoQrNequi) textoQrNequi.classList.toggle('hidden', !usarQr);
  if (btnPagarNequiLink) btnPagarNequiLink.classList.toggle('hidden', !usarQr || !linkSeguro);

  if (nequiKeyBlock) nequiKeyBlock.classList.toggle('hidden', !usarLlave);
  if (nequiKeyContent && btnToggleNequiKey) {
    if (usarLlave) {
      nequiKeyContent.classList.remove('hidden');
      btnToggleNequiKey.textContent = 'Ocultar llave';
    } else {
      nequiKeyContent.classList.add('hidden');
      btnToggleNequiKey.textContent = 'Mostrar llave';
    }
  }
  if (nequiNumeroBlock) nequiNumeroBlock.classList.toggle('hidden', !usarNumero);
}

function configurarMetodoPagoUI() {
  if (!metodoBtns.length) return;

  const hasQr = Boolean(obtenerLinkNequiSeguro(sorteoId) || imgQrNequiFallback);
  const hasKey = Boolean(obtenerLlaveNequi(sorteoId));
  const hasNumero = Boolean(obtenerNumeroNequi());

  if (hasQr) {
    pagoMetodoActual = 'nequi_qr';
  } else if (hasKey) {
    pagoMetodoActual = 'nequi_key';
  } else if (hasNumero) {
    pagoMetodoActual = 'nequi_numero';
  } else {
    pagoMetodoActual = 'manual';
  }

  metodoBtns.forEach((btn) => {
    const method = btn.getAttribute('data-pago-metodo');
    if (method === pagoMetodoActual) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      pagoMetodoActual = method || 'manual';
      metodoBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      aplicarMetodoPagoUI(pagoMetodoActual);
    });
  });

  aplicarMetodoPagoUI(pagoMetodoActual);
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

    if (nums.length === 0) {
      if (misNumerosEnSorteoCard) misNumerosEnSorteoCard.style.display = 'none';
      if (estadoNoParticipante) estadoNoParticipante.style.display = 'block';
      if (btnMisNumeros) btnMisNumeros.classList.add('hidden');
      return;
    }

    if (estadoNoParticipante) estadoNoParticipante.style.display = 'none';
    if (misNumerosEnSorteoCard) misNumerosEnSorteoCard.style.display = 'block';
    if (btnMisNumeros) btnMisNumeros.classList.remove('hidden');
    nums.sort((a, b) => Number(a) - Number(b));

    misNumerosEnSorteoTexto.textContent = `Aprobados: ${nums.length} número(s)`;

    misNumerosEnSorteoChips.innerHTML = nums.map(n => `
      <span class="chip-numero">#${n}</span>
    `).join('');

  } catch (err) {
  }
}



// --- cargar sorteo desde backend ---
async function cargarSorteo() {
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
      tituloSorteo.textContent = data.error || 'Error al cargar la ronda';
      return;
    }

    sorteoActual = data;
    precioNumero = Number(sorteoActual.precio_numero) || 0;
    numerosOcupados = Array.isArray(sorteoActual.numeros_ocupados)
      ? sorteoActual.numeros_ocupados
      : [];

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
      actualizarEstadoConfirmar();
      return;
    }


    // Validaciones básicas: tipo y tamaño
    if (!file.type || !file.type.startsWith('image/')) {
      mostrarToast('Selecciona un archivo de imagen (jpg, png, ...).');
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      mostrarToast('El archivo es demasiado grande. Máx 2 MB.');
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      return;
    }


    const url = URL.createObjectURL(file);
    _currentObjectUrl = url;
    imgPreview.src = url;
    previewComprobante.classList.remove('oculto');
    actualizarEstadoConfirmar();

  });
}

if (sinComprobante) {
  sinComprobante.addEventListener('change', () => {
    const activo = sinComprobante.checked;
    if (pagadorDatos) pagadorDatos.classList.toggle('oculto', !activo);
    if (inputComprobante) {
      inputComprobante.disabled = activo;
      if (activo) {
        inputComprobante.value = '';
        if (previewComprobante) previewComprobante.classList.add('oculto');
        if (imgPreview) imgPreview.src = '';
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

    const file = inputComprobante?.files?.[0];
    const pagadorNombre = (inputPagadorNombre?.value || '').trim();
    const pagadorTelefono = (inputPagadorTelefono?.value || '').replace(/\D+/g, '');
    const pagadorOk = pagadorNombre.length >= 3 && pagadorTelefono.length >= 10;
    const metodo = pagoMetodoActual || (file ? 'comprobante' : 'manual');

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
        numeros: seleccionados,
        comprobante: base64,
        pagador_nombre: pagadorNombre || null,
        pagador_telefono: pagadorTelefono || null,
        pago_metodo: metodo
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
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar participación';
        return;
      }

      mostrarToast('¡Listo! Tu participación quedó registrada como pendiente ✅');

      // reset selección
      seleccionados = [];
      if (inputComprobante) inputComprobante.value = '';
      if (previewComprobante) previewComprobante.classList.add('oculto');
      if (imgPreview) imgPreview.src = '';
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
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar participación';
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

  if (paymentFormAccordion) {
    paymentFormAccordion.addEventListener('toggle', () => {
      if (paymentFormAccordion.open) {
        scrollToPaymentStep();
      }
    });
  }

  configurarPagoNequiPorLink();
  configurarLlaveNequi();
  configurarNumeroNequi();
  configurarMetodoPagoUI();
  cargarSorteo();
  cargarMisNumerosDelSorteo();
});












