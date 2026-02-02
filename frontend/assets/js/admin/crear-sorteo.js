// assets/js/admin/crear-sorteo.js

const API_URL = window.API_URL; // viene de config.js

let modoEdicion = false;
let sorteoId = null;
let estadoActual = 'activo';
let imagenActualUrl = null;

function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
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
  const imagenInput = document.getElementById('imagen');

  if (!descripcion || !premio || !cantidad_numeros || !precio_numero || !fecha_sorteo) {
    mostrarToast('Por favor completa todos los campos obligatorios.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    mostrarToast('Sesión no válida. Inicia sesión nuevamente.');
    return;
  }

  // 🔹 MODO CREAR (sin id en la URL)
  if (!modoEdicion) {
    const formData = new FormData();
    formData.append('descripcion', descripcion);
    formData.append('premio', premio);
    formData.append('cantidad_numeros', cantidad_numeros);
    formData.append('precio_numero', precio_numero);
    formData.append('fecha_sorteo', fecha_sorteo);

    if (imagenInput.files[0]) {
      formData.append('imagen', imagenInput.files[0]);
    }

    try {
      const resp = await fetch(`${API_URL}/api/sorteos/crear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // NO poner Content-Type, el navegador lo setea para multipart/form-data
        },
        body: formData,
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        console.error('Error creando sorteo:', data.error || data);
        mostrarToast(data.error || 'Error al crear el sorteo.');
        return;
      }

      mostrarToast('Sorteo creado correctamente.');
      setTimeout(() => {
        window.location.href = 'panel.html';
      }, 1200);
    } catch (err) {
      console.error(err);
      mostrarToast('Error de conexión al crear el sorteo.');
    }

    return;
  }

  // 🔹 MODO EDICIÓN (hay id en la URL → PUT /api/sorteos/:id)
  try {
    const formData = new FormData();
    formData.append('descripcion', descripcion);
    formData.append('premio', premio);
    formData.append('cantidad_numeros', cantidad_numeros);
    formData.append('precio_numero', precio_numero);
    formData.append('fecha_sorteo', fecha_sorteo);
    formData.append('estado', estadoActual);

    // Si el admin seleccionó una NUEVA imagen, la enviamos
    if (imagenInput.files[0]) {
      formData.append('imagen', imagenInput.files[0]);
    }
    // Si no hay archivo nuevo, el backend mantendrá la imagen_url actual

    const resp = await fetch(`${API_URL}/api/sorteos/${sorteoId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        // 🚫 No pongas 'Content-Type' aquí, el navegador lo arma para multipart/form-data
      },
      body: formData,
    });

    const data = await resp.json();

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
    mostrarToast('Error de conexión al actualizar el sorteo.');
  }

}

document.addEventListener('DOMContentLoaded', () => {
  initPreviewImagen();

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
