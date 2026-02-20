const API_URL = window.API_URL || '';

// Key para persistir orden en localStorage
const STORAGE_KEY = 'admin_sorteos_order_v1';

export async function cargarSorteosAdmin() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.rol !== 'admin') return;

  const cont = document.getElementById('sorteosAdmin');
  if (!cont) return;

  // transición suave para actualización
  cont.style.transition = cont.style.transition || 'opacity 0.25s ease';
  cont.style.opacity = '0.3';

  try {
    const res = await fetch(`${API_URL}/api/sorteos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error cargando sorteos para admin:', data);
      cont.innerHTML = '<p>Error al cargar sorteos.</p>';
      cont.style.opacity = '1';
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      cont.innerHTML = '<p>Aún no tienes sorteos creados. Empieza con el botón “Crear sorteo”.</p>';
      cont.style.opacity = '1';
      return;
    }

    const hasServerOrder = data.some(s => s.sort_order !== null && s.sort_order !== undefined);
    let ordered = data;

    if (hasServerOrder) {
      // Backend tiene orden global, limpiamos fallback local
      localStorage.removeItem(STORAGE_KEY);
    }

    // Si el backend no tiene orden persistido, usar localStorage como fallback
    if (!hasServerOrder) {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const byId = new Map(data.map(s => [String(s.id), s]));
      ordered = [];

      // Primero los que están en el orden guardado
      for (const id of stored) {
        if (byId.has(String(id))) {
          ordered.push(byId.get(String(id)));
          byId.delete(String(id));
        }
      }

      // Luego los restantes (nuevos) en el orden recibido
      for (const s of data) {
        if (byId.has(String(s.id))) {
          ordered.push(s);
          byId.delete(String(s.id));
        }
      }
    }

    // Renderizar con atributos para drag & drop
    cont.innerHTML = ordered
      .map(s => {
        const ocupacion = `${s.ocupados} / ${s.cantidad_numeros}`;
        const lleno = s.estado === 'lleno';
        const finalizado = s.estado === 'finalizado';

        let estadoLabel = '';
        if (finalizado) {
          estadoLabel = '<span class="badge badge-danger">Finalizado</span>';
        } else if (lleno) {
          estadoLabel = '<span class="badge badge-warning">Lleno — Listo para resultado en vivo</span>';
        } else {
          estadoLabel = '<span class="badge badge-success">En venta</span>';
        }

        const btnRuleta = lleno
          ? `<div class="ruleta-actions-admin">
              <button class="btn btn-secondary btn-sm" onclick="location.href='ruleta.html?sorteo=${s.id}'">🎰 Iniciar sorteo</button>
              <button class="btn btn-ghost btn-sm" onclick="window.open('../participante/ruleta-live.html?id=${s.id}', '_blank', 'noopener')">👁 Ver resultado en vivo</button>
            </div>`
          : '';

        const imagenHtml = s.imagen_url
          ? `<div class="sorteo-admin-image"><img src="${s.imagen_url}" alt="Imagen sorteo ${s.descripcion}"></div>`
          : '';

        return `
          <article class="sorteo-card-admin draggable-sorteo" draggable="true" data-id="${s.id}">
            ${imagenHtml}
            <div class="sorteo-admin-body">
              <div class="sorteo-header-admin">
                <h3>${s.descripcion}</h3>
                ${estadoLabel}
              </div>
              <p class="sorteo-detalle">Beneficio: <strong>${s.premio}</strong></p>
              <p class="sorteo-detalle">Ocupación: <strong>${ocupacion}</strong></p>
              <p class="sorteo-detalle-mini">${
                lleno
                  ? 'Esta ronda ya está completa. Puedes publicar el resultado en vivo y generar expectativa.'
                  : 'Aún se están vendiendo números. Cuantos más participen, más fuerte se siente el momento de la ronda.'
              }</p>
              <div class="sorteo-actions-admin">
                ${btnRuleta}
                <button class="btn btn-warning btn-sm" onclick="editarSorteo(${s.id})">✏️ Editar</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarSorteo(${s.id})">🗑 Eliminar</button>
                <button class="btn btn-primary btn-sm" onclick="verDetalleSorteo(${s.id})">👁 Ver detalle</button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    // Inicializar drag & drop para permitir reordenar
    initDragAndDrop(cont);
    cont.style.opacity = '1';
  } catch (err) {
    console.error(err);
    cont.innerHTML = '<p>Error de conexión al cargar los sorteos.</p>';
    cont.style.opacity = '1';
  }
}

function editarSorteo(id) {
  location.href = `crear-sorteo.html?id=${id}`;
}

async function eliminarSorteo(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sesión expirada. Vuelve a iniciar sesión.');
    return;
  }

  const confirmar = confirm('¿Seguro que quieres ELIMINAR esta ronda? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  try {
    const res = await fetch(`${API_URL}/api/sorteos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('Error al eliminar sorteo:', data);
      alert(data.error || 'No se pudo eliminar la ronda.');
      return;
    }

    // Quitar del orden guardado
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = stored.filter(x => String(x) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    await cargarSorteosAdmin();
  } catch (err) {
    console.error('Error de red al eliminar sorteo:', err);
    alert('Error de conexión al intentar eliminar el sorteo.');
  }
}

function verDetalleSorteo(id) {
  location.href = `sorteo-detalle.html?id=${id}`;
}

// Drag & Drop
function initDragAndDrop(container) {
  // Evitar reinicializar múltiples veces
  if (container._dndInit) return;
  container._dndInit = true;

  let dragEl = null;

  container.addEventListener('dragstart', (e) => {
    const target = e.target.closest('.draggable-sorteo');
    if (!target) return;
    dragEl = target;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', target.dataset.id); } catch (err) {}
    target.classList.add('dragging');
  });

  container.addEventListener('dragend', (e) => {
    if (dragEl) dragEl.classList.remove('dragging');
    dragEl = null;
    // Guardar orden cuando termina arrastre
    persistOrderFromDOM(container);
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const after = getDragAfterElement(container, e.clientY);
    const dragging = container.querySelector('.dragging');
    if (!dragging) return;
    if (after == null) {
      container.appendChild(dragging);
    } else {
      container.insertBefore(dragging, after);
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    persistOrderFromDOM(container);
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draggable-sorteo:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element || null;
}

function persistOrderFromDOM(container) {
  const ids = [...container.querySelectorAll('.draggable-sorteo')].map(el => el.dataset.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  // Intentar persistir en servidor; si falla, localStorage mantiene el orden para este navegador
  sendOrderToServer(ids).catch(err => {
    console.warn('No se pudo persistir orden en servidor, usando localStorage:', err);
  });
}

async function sendOrderToServer(ids) {
  const token = localStorage.getItem('token');
  if (!token) return Promise.reject(new Error('No token'));

  // Endpoint sugerido: POST /api/sorteos/reorder { order: [id,...] }
  const url = `${API_URL}/api/sorteos/reorder`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ order: ids })
    });

    if (res.status === 404) {
      // Endpoint no existe en backend
      return Promise.reject(new Error('Endpoint /api/sorteos/reorder no disponible (404)'));
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return Promise.reject(new Error(data.error || `Error ${res.status}`));
    }

    // OK: limpiar fallback local para evitar divergencias
    localStorage.removeItem(STORAGE_KEY);
    return res.json().catch(() => ({}));
  } catch (err) {
    return Promise.reject(err);
  }
}

// Hacemos accesibles las funciones desde el HTML inline
window.editarSorteo = editarSorteo;
window.eliminarSorteo = eliminarSorteo;
window.verDetalleSorteo = verDetalleSorteo;







