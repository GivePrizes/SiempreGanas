// assets/js/participante/sorteo-detalle.js

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
    resumenNumeros.textContent = 'Ninguno todavía';
    resumenTotal.textContent = '$0';
  } else {
    resumenNumeros.textContent = seleccionados.join(', ');
    const total = seleccionados.length * precioNumero;
    resumenTotal.textContent = `$${total.toLocaleString('es-CO')}`;
  }
}

function renderNumeros() {
  if (!sorteoActual) return;

  const total = sorteoActual.cantidad_numeros;
  gridNumeros.innerHTML = '';

  for (let n = 1; n <= total; n++) {
    const ocupado = numerosOcupados.includes(n);
    const div = document.createElement('div');
    div.className = 'numero-item';
    div.textContent = n.toString();

    if (ocupado) {
      div.classList.add('ocupado');
    } else {
      div.addEventListener('click', () => toggleNumero(n, div));
    }

    gridNumeros.appendChild(div);
  }
}

function toggleNumero(numero, el) {
  const idx = seleccionados.indexOf(numero);

  if (idx >= 0) {
    // quitar selección
    seleccionados.splice(idx, 1);
    el.classList.remove('seleccionado');
  } else {
    if (seleccionados.length >= MAX_NUMEROS_POR_COMPRA) {
      mostrarToast(`Máximo ${MAX_NUMEROS_POR_COMPRA} números por compra.`);
      return;
    }
    seleccionados.push(numero);
    el.classList.add('seleccionado');
  }

  actualizarResumen();
}

// Nota: Envío multipart/FormData en lugar de Base64 (más eficiente para imágenes)

// --- cargar sorteo desde backend ---
async function cargarSorteo() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user.id) {
    location.href = '../index.html';
    return;
  }

  if (!sorteoId) {
    tituloSorteo.textContent = 'Sorteo no especificado';
    subtituloSorteo.textContent = 'Vuelve al panel y entra desde un sorteo válido.';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/sorteos/${sorteoId}`);
    const data = await res.json();

    if (!res.ok) {
      console.error('Error sorteo:', data);
      tituloSorteo.textContent = data.error || 'Error al cargar el sorteo';
      return;
    }

    sorteoActual = data;
    precioNumero = Number(sorteoActual.precio_numero) || 0;
    numerosOcupados = Array.isArray(sorteoActual.numeros_ocupados)
      ? sorteoActual.numeros_ocupados
      : [];

    // Hero
    tituloSorteo.textContent = sorteoActual.descripcion;
    tituloPremio.textContent = 'Sorteo: ' + sorteoActual.descripcion;
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
      if (faltan <= 0) {
        textoProgreso.innerHTML =
          `Todos los números están vendidos. Este sorteo está <strong>listo para ruleta</strong>.`;
      } else {
        textoProgreso.innerHTML =
          `${ocupados} de ${total} números vendidos • Quedan <strong>${faltan}</strong>`;
      }
    }

    if (faltan <= 0 || sorteoActual.estado === 'lleno') {
      subtituloSorteo.textContent =
        'Este sorteo ya está lleno. La ruleta puede activarse en cualquier momento.';
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Cupo lleno';
      }
    }

    renderNumeros();
    actualizarResumen();
  } catch (err) {
    console.error(err);
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

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      mostrarToast('El archivo es demasiado grande. Máx 5 MB.');
      inputComprobante.value = '';
      previewComprobante.classList.add('oculto');
      imgPreview.src = '';
      return;
    }

    const url = URL.createObjectURL(file);
    _currentObjectUrl = url;
    imgPreview.src = url;
    previewComprobante.classList.remove('oculto');
  });
}

// --- confirmar participación ---
if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
      location.href = '../index.html';
      return;
    }

    if (!sorteoActual) {
      mostrarToast('El sorteo no está listo todavía.');
      return;
    }

    if (seleccionados.length === 0) {
      mostrarToast('Selecciona al menos un número antes de confirmar.');
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
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      mostrarToast('El comprobante es demasiado grande. Máx 5 MB.');
      return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Enviando...';

    try {
      // Construir FormData (multipart) — backend debe aceptar multipart/form-data
      const formData = new FormData();
      formData.append('sorteo_id', String(Number(sorteoId)));
      // Enviar los números como JSON en un campo
      formData.append('numeros', JSON.stringify(seleccionados));
      formData.append('comprobante', file);

      const res = await fetch(`${API_URL}/api/participante/guardar-numeros`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // NO poner Content-Type: fetch lo establece automáticamente para FormData
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error guardar numeros:', data);
        mostrarToast(data.error || data.message || 'Error al guardar tu participación.');
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar participación';
        return;
      }

      mostrarToast('¡Listo! Tu participación quedó registrada como pendiente ✅');
      // reset selección
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
      console.error(err);
      mostrarToast('Error de conexión al enviar tu participación.');
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar participación';
    }
  });
}

// --- init ---
document.addEventListener('DOMContentLoaded', cargarSorteo);
