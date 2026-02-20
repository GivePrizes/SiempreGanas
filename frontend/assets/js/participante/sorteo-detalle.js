// assets/js/participante/sorteo-detalle.js

const API_URL = window.API_URL || ''; // viene de config.js
// IMPORTANTE: el chat usa mÃ³dulos ES
import { initChat } from '../chat/index.js';

// obtener sorteoId de la URL
const params = new URLSearchParams(window.location.search);
const sorteoId = params.get('id');

const MAX_NUMEROS_POR_COMPRA = 5;

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

const btnConfirmar = document.getElementById('btnConfirmar');
const toast = document.getElementById('toast');
const misNumerosEnSorteoCard = document.getElementById('misNumerosEnSorteoCard');
const misNumerosEnSorteoTexto = document.getElementById('misNumerosEnSorteoTexto');
const misNumerosEnSorteoChips = document.getElementById('misNumerosEnSorteoChips');
const estadoNoParticipante = document.getElementById('estadoNoParticipante');
const btnMisNumeros = document.getElementById('btnMisNumeros');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatHint = document.getElementById('chatHint');


let sorteoActual = null;
let numerosOcupados = [];
let seleccionados = [];
let precioNumero = 0;

if (maxNumerosTexto) maxNumerosTexto.textContent = MAX_NUMEROS_POR_COMPRA.toString();

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
    resumenNumeros.textContent = 'Ninguno todavÃ­a';
    resumenTotal.textContent = '$0';
  } else {
    resumenNumeros.textContent = seleccionados.join(', ');
    const total = seleccionados.length * precioNumero;
    resumenTotal.textContent = `$${total.toLocaleString('es-CO')}`;
  }

  actualizarEstadoConfirmar();

}

// habilitar/deshabilitar botÃ³n confirmar segÃºn selecciÃ³n y comprobante
function actualizarEstadoConfirmar() {
  if (!btnConfirmar) return;

  // Si el sorteo estÃ¡ lleno, se mantiene bloqueado
  if (sorteoActual && (sorteoActual.estado === 'lleno')) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Cupo lleno';
    return;
  }

  const file = inputComprobante?.files?.[0];
  const listo = (seleccionados.length > 0) && !!file;

  btnConfirmar.disabled = !listo;
  btnConfirmar.textContent = listo
    ? 'Confirmar participaciÃ³n'
    : 'Selecciona nÃºmeros y sube comprobante';
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
      // estilo de nÃºmero ya vendido / ocupado
      div.classList.add('numero-bola--ocupado');
      div.setAttribute('aria-disabled', 'true');
    } else {
      // si ese nÃºmero ya estÃ¡ en "seleccionados", marcarlo
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

  // Recorremos todos los nÃºmeros pintados
  gridNumeros.querySelectorAll('.numero-bola').forEach((el) => {
    const n = Number(el.dataset.numero);

    const ocupado = el.classList.contains('numero-bola--ocupado');
    const seleccionado = el.classList.contains('numero-bola--seleccionado');

    // Si estÃ¡ ocupado, no tocamos nada
    if (ocupado) return;

    // Si se alcanzÃ³ el max, apagamos los NO seleccionados
    if (maxAlcanzado && !seleccionado) {
      el.classList.add('numero-bola--bloqueado');
      el.setAttribute('aria-disabled', 'true');
    } else {
      el.classList.remove('numero-bola--bloqueado');
      el.removeAttribute('aria-disabled');
    }
  });
}


// --- funciÃ³n para copiar Nequi (global para el onclick del HTML) ---
function copiarNequi() {
  const numero = '3123450890';

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(numero)
      .then(() => {
        mostrarToast('NÃºmero Nequi copiado âœ…');
      })
      .catch(() => {
        alert('No se pudo copiar automÃ¡ticamente, pero el nÃºmero es: ' + numero);
      });
  } else {
    // Fallback para navegadores antiguos / contextos no seguros
    const inputOculto = document.createElement('input');
    inputOculto.value = numero;
    document.body.appendChild(inputOculto);
    inputOculto.select();
    document.execCommand('copy');
    document.body.removeChild(inputOculto);
    alert('NÃºmero Nequi copiado âœ…');
  }
}

// exponerla al scope global, porque el script es type="module"
window.copiarNequi = copiarNequi;


function toggleNumero(numero, el) {
  // por seguridad: si estÃ¡ ocupado, no hacer nada
  if (el.classList.contains('numero-bola--ocupado')) return;

  const idx = seleccionados.indexOf(numero);

  if (idx >= 0) {
    // quitar selecciÃ³n
    seleccionados.splice(idx, 1);
    el.classList.remove('numero-bola--seleccionado');
  } else {
    if (seleccionados.length >= MAX_NUMEROS_POR_COMPRA) {
      mostrarToast(`MÃ¡ximo ${MAX_NUMEROS_POR_COMPRA} nÃºmeros por compra.`);
      return;
    }
    seleccionados.push(numero);
    el.classList.add('numero-bola--seleccionado');
  }

  actualizarResumen();
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

// --- cargar mis nÃºmeros en esta ronda ---
async function cargarMisNumerosDelSorteo() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user.id) return;
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
      if (chatInput) chatInput.disabled = true;
      if (chatSend) chatSend.disabled = true;
      if (chatHint) chatHint.textContent = 'Participa para unirte a la conversaciÃ³n.';
      return;
    }

    if (estadoNoParticipante) estadoNoParticipante.style.display = 'none';
    if (misNumerosEnSorteoCard) misNumerosEnSorteoCard.style.display = 'block';
    if (btnMisNumeros) btnMisNumeros.classList.remove('hidden');
    if (chatInput) chatInput.disabled = false;
    if (chatSend) chatSend.disabled = false;
    if (chatHint) chatHint.textContent = '';
    nums.sort((a, b) => Number(a) - Number(b));

    misNumerosEnSorteoTexto.textContent = `Aprobados: ${nums.length} nÃºmero(s)`;

    misNumerosEnSorteoChips.innerHTML = nums.map(n => `
      <span class="chip-numero">#${n}</span>
    `).join('');

  } catch (err) {
  }
}



// --- cargar sorteo desde backend ---
async function cargarSorteo() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user.id) {
    location.href = '../index.html';
    return;
  }

  if (!sorteoId) {
    tituloSorteo.textContent = 'Ronda no especificada';
    subtituloSorteo.textContent = 'Vuelve al panel y entra desde una ronda valida.';
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
        textoCupos.innerHTML = 'Ronda completa · lista para resultado en vivo';
      } else {
        textoCupos.innerHTML = `Quedan <strong>${faltan}</strong> cupos disponibles`;
      }
    }

    if (faltan <= 0 || sorteoActual.estado === 'lleno') {
      subtituloSorteo.textContent =
        'Esta ronda ya estÃ¡ completa. El resultado en vivo puede activarse en cualquier momento.';
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        await cargarMisNumerosDelSorteo();
        btnConfirmar.textContent = 'Cupo lleno';
      }
    }

    renderNumeros();
    actualizarResumen();

    // === INICIALIZA CHAT AQUÃ (al final del try) ===
    if (token && sorteoId) {
      const chatContainer = document.getElementById('chatContainer');
      if (chatContainer) {
        chatContainer.style.display = 'block'; // muestra el chat
        try {
          initChat({ sorteoId, token });
        } catch (err) {
          document.getElementById('chatHint').textContent = 'Error al cargar chat. Recarga la pagina.';
        }
      }
    } else {
      const hint = document.getElementById('chatHint');
      if (hint) {
        hint.textContent = token ? 'Ronda no valida' : 'Inicia sesion para chatear';
      }
    }

  } catch (err) {
    tituloSorteo.textContent = 'Error de conexiÃ³n al cargar el sorteo.';
  }
}

// --- manejar comprobante ---
if (inputComprobante) {
  let _currentObjectUrl = null;
  inputComprobante.addEventListener('change', () => {
    const file = inputComprobante.files[0];
    // limpiar url anterior si habÃ­a
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


    // Validaciones bÃ¡sicas: tipo y tamaÃ±o
    if (!file.type || !file.type.startsWith('image/')) {
      mostrarToast('Selecciona un archivo de imagen (jpg, png, ...).');
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      mostrarToast('El archivo es demasiado grande. MÃ¡x 2 MB.');
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

// --- confirmar participaciÃ³n ---
if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
      location.href = '../index.html';
      return;
    }

    if (!sorteoActual) {
      mostrarToast('La ronda no esta lista todavia.');
      return;
    }

    if (seleccionados.length === 0) {
      mostrarToast('Selecciona al menos un nÃºmero antes de confirmar.');
      return;
    }

    const file = inputComprobante.files[0];
    if (!file) {
      mostrarToast('Debes subir una imagen del comprobante de pago.');
      return;
    }

    // Validaciones duplicadas por seguridad antes de enviar
    if (!file.type || !file.type.startsWith('image/')) {
      mostrarToast('El comprobante debe ser una imagen (jpg, png, ...).');
      return;
    }
    const maxBytes = 2 * 1024 * 1024; // 2 MB

    if (file.size > maxBytes) {
      mostrarToast('El comprobante es demasiado grande. MÃ¡x 2 MB.');
      return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Enviando...';

    try {
      // 1ï¸âƒ£ convertir archivo a base64 (data URL)
      const base64 = await fileToBase64(file);

      // 2ï¸âƒ£ armar body JSON como lo espera el backend
      const body = {
        sorteo_id: Number(sorteoId),
        numeros: seleccionados,
        comprobante: base64
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
        mostrarToast(data.error || data.message || 'Error al guardar tu participaciÃ³n.');
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar participaciÃ³n';
        return;
      }

      mostrarToast('Â¡Listo! Tu participaciÃ³n quedÃ³ registrada como pendiente âœ…');

      // reset selecciÃ³n
      seleccionados = [];
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      actualizarResumen();

      // Opcional: recargar ocupados
      await cargarSorteo();

      setTimeout(() => {
        location.href = 'mis-numeros.html';
      }, 2000);
    } catch (err) {
      mostrarToast('Error de conexiÃ³n al enviar tu participaciÃ³n.');
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar participaciÃ³n';
    }
  });
}

// --- init ---
document.addEventListener('DOMContentLoaded', () => {
  cargarSorteo();
  cargarMisNumerosDelSorteo();
});











