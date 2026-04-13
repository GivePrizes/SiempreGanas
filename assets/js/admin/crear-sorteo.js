// assets/js/admin/crear-sorteo.js

const API_URL = window.API_URL; // viene de config.js

let modoEdicion = false;
let sorteoId = null;
let estadoActual = 'activo';
let imagenActualUrl = null;

function getTipoProductoValue() {
  const input = document.getElementById('tipo_producto');
  const value = String(input?.value || '').trim().toLowerCase();
  return ['pantalla', 'combo', 'juegos'].includes(value) ? value : 'pantalla';
}

function renderTipoProductoHelp() {
  const help = document.getElementById('tipoProductoHelp');
  if (!help) return;

  const tipoProducto = getTipoProductoValue();

  if (tipoProducto === 'combo') {
    help.textContent = 'Combo: usalo para paquetes con varias pantallas, beneficios o accesos en una misma ronda.';
    return;
  }

  if (tipoProducto === 'juegos') {
    help.textContent = 'Juegos: usalo para cuentas gamer, monedas, membresias, keys o beneficios relacionados con gaming.';
    return;
  }

  help.textContent = 'Pantalla: usalo para una cuenta individual o acceso principal de una sola plataforma.';
}

function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function readResponseData(resp) {
  const text = await resp.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function normalizarNumeroDecimal(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalPos = Math.max(lastComma, lastDot);

  if (decimalPos === -1) {
    return cleaned.replace(/[.,]/g, '');
  }

  const integerPart = cleaned.slice(0, decimalPos).replace(/[.,]/g, '');
  const decimalPart = cleaned.slice(decimalPos + 1).replace(/[.,]/g, '');
  return `${integerPart || '0'}.${decimalPart || '0'}`;
}

function parseCantidadNumeros(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePrecioNumero(value) {
  const normalized = normalizarNumeroDecimal(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
}

function initPreviewImagen() {
  const input = document.getElementById('imagen');
  const preview = document.getElementById('previewImagen');

  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files[0];

    if (!file) {
      // si no hay archivo y estamos en edición, mostramos la imagen actual (si existe)
      if (modoEdicion && imagenActualUrl) {
        preview.innerHTML = `<img src="${imagenActualUrl}" alt="Imagen actual del sorteo">`;
      } else {
        preview.innerHTML = '<span>Sin imagen seleccionada</span>';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Previsualización">`;
    };
    reader.readAsDataURL(file);
  });
}

function initTipoProductoUI() {
  const input = document.getElementById('tipo_producto');
  if (!input) return;

  renderTipoProductoHelp();
  input.addEventListener('change', renderTipoProductoHelp);
}

/**
 * Cargar datos de un sorteo existente para modo EDICIÓN
 */
async function cargarSorteoParaEditar(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    mostrarToast('Sesión no válida. Inicia sesión nuevamente.');
    return;
  }

  try {
    const resp = await fetch(`${API_URL}/api/sorteos/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      console.error('Error cargando sorteo para editar:', resp.status);
      mostrarToast('No se pudo cargar el sorteo para edición.');
      return;
    }

    const s = await resp.json();

    // Rellenar campos
    document.getElementById('descripcion').value = s.descripcion || '';
    document.getElementById('premio').value = s.premio || '';
    document.getElementById('tipo_producto').value = s.tipo_producto || 'pantalla';
    document.getElementById('cantidad_numeros').value = s.cantidad_numeros || '';
    document.getElementById('precio_numero').value = s.precio_numero || '';
    if (document.getElementById('fecha_sorteo')) {
      document.getElementById('fecha_sorteo').value = s.fecha_sorteo
        ? s.fecha_sorteo.substring(0, 10) // por si viene con hora
        : '';
    }

    estadoActual = s.estado || 'activo';
    imagenActualUrl = s.imagen_url || null;

    // Mostrar imagen actual si existe
    const preview = document.getElementById('previewImagen');
    if (preview) {
      if (imagenActualUrl) {
        preview.innerHTML = `<img src="${imagenActualUrl}" alt="Imagen actual del sorteo">`;
      } else {
        preview.innerHTML = '<span>Sin imagen</span>';
      }
    }

    // Si quieres, puedes deshabilitar el input de imagen en edición (por ahora no manejamos cambio de imagen)
    const inputImagen = document.getElementById('imagen');
    if (inputImagen) {
      // Opcional: dejarlo deshabilitado en edición
      // inputImagen.disabled = true;
      // o mostrar un texto indicando que la imagen no se cambia aún
    }

    // Cambiar el título del formulario y el texto del botón para indicar modo edición
    const titulo = document.querySelector('h2');
    if (titulo) {
      titulo.textContent = 'Editar sorteo';
    }
    const btn = document.querySelector('#formCrearSorteo button[type="submit"]');
    if (btn) {
      btn.textContent = 'Guardar cambios';
    }

    renderTipoProductoHelp();
  } catch (err) {
    console.error(err);
    mostrarToast('Error de conexión al cargar el sorteo.');
  }
}

async function enviarFormulario(e) {
  e.preventDefault();

  const descripcion = document.getElementById('descripcion').value.trim();
  const premio = document.getElementById('premio').value.trim();
  const cantidad_numeros = document.getElementById('cantidad_numeros').value;
  const precio_numero = document.getElementById('precio_numero').value;
  const fecha_sorteo = document.getElementById('fecha_sorteo').value;
  const tipo_producto = getTipoProductoValue();
  const imagenInput = document.getElementById('imagen');
  const submitBtn = document.querySelector('#formCrearSorteo button[type="submit"]');
  const cantidadNumeros = parseCantidadNumeros(cantidad_numeros);
  const precioNumero = parsePrecioNumero(precio_numero);

  if (!descripcion || !premio || !cantidad_numeros || !precio_numero || !fecha_sorteo) {
    mostrarToast('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (!cantidadNumeros) {
    mostrarToast('La cantidad de números debe ser un entero mayor que 0.');
    return;
  }

  if (!precioNumero) {
    mostrarToast('El precio por número debe ser mayor que 0.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    mostrarToast('Sesión no válida. Inicia sesión nuevamente.');
    return;
  }

  const oldBtnText = submitBtn?.textContent || 'Guardar sorteo';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = modoEdicion ? 'Guardando cambios...' : 'Guardando...';
  }

  try {
    // 🔹 MODO CREAR (sin id en la URL)
    if (!modoEdicion) {
      const formData = new FormData();
      formData.append('descripcion', descripcion);
      formData.append('premio', premio);
      formData.append('cantidad_numeros', String(cantidadNumeros));
      formData.append('precio_numero', precioNumero.toFixed(2));
      formData.append('fecha_sorteo', fecha_sorteo);
      formData.append('tipo_producto', tipo_producto);

      if (imagenInput.files[0]) {
        formData.append('imagen', imagenInput.files[0]);
      }

      const resp = await fetch(`${API_URL}/api/sorteos/crear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // NO poner Content-Type, el navegador lo setea para multipart/form-data
        },
        body: formData,
      });

      const data = await readResponseData(resp);

      if (!resp.ok || data.error) {
        console.error('Error creando sorteo:', data.error || data);
        mostrarToast(data.error || 'Error al crear el sorteo.');
        return;
      }

      mostrarToast('Sorteo creado correctamente.');
      setTimeout(() => {
        window.location.href = 'panel.html';
      }, 1200);
      return;
    }

    // 🔹 MODO EDICIÓN (hay id en la URL → PUT /api/sorteos/:id)
    const payload = {
      descripcion,
      premio,
      cantidad_numeros: String(cantidadNumeros),
      precio_numero: precioNumero.toFixed(2),
      fecha_sorteo,
      tipo_producto,
      estado: estadoActual,
    };

    const hasNewImage = Boolean(imagenInput.files[0]);
    let resp;

    if (hasNewImage) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('imagen', imagenInput.files[0]);

      resp = await fetch(`${API_URL}/api/sorteos/${sorteoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } else {
      resp = await fetch(`${API_URL}/api/sorteos/${sorteoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    const data = await readResponseData(resp);

    if (!resp.ok || data.error) {
      console.error('Error actualizando sorteo:', data.error || data);
      mostrarToast(data.error || 'Error al actualizar el sorteo.');
      return;
    }

    mostrarToast('Sorteo actualizado correctamente.');
    setTimeout(() => {
      window.location.href = 'panel.html';
    }, 1200);
  } catch (err) {
    console.error(err);
    mostrarToast(
      modoEdicion
        ? 'Error de conexión al actualizar el sorteo.'
        : 'Error de conexión al crear el sorteo.'
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldBtnText;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPreviewImagen();
  initTipoProductoUI();

  // Detectar si hay ?id= en la URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) {
    modoEdicion = true;
    sorteoId = id;
    cargarSorteoParaEditar(id);
  }

  const form = document.getElementById('formCrearSorteo');
  if (form) {
    form.addEventListener('submit', enviarFormulario);
  }
});



