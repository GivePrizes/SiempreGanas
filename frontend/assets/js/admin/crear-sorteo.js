// assets/js/admin/crear-sorteo.js

const API_URL = window.API_URL; // viene de config.js

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
      preview.innerHTML = '<span>Sin imagen seleccionada</span>';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Previsualización">`;
    };
    reader.readAsDataURL(file);
  });
}

async function enviarFormulario(e) {
  e.preventDefault();

  const form = e.currentTarget;
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
        // IMPORTANTE: NO poner 'Content-Type' aquí.
        // El navegador lo setea solo con el boundary de multipart/form-data.
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
    // Pequeño delay y regresar al panel
    setTimeout(() => {
      window.location.href = 'panel.html';
    }, 1200);
  } catch (err) {
    console.error(err);
    mostrarToast('Error de conexión al crear el sorteo.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPreviewImagen();
  const form = document.getElementById('formCrearSorteo');
  if (form) {
    form.addEventListener('submit', enviarFormulario);
  }
});
