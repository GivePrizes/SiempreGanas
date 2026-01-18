// frontend/assets/js/chat/ui.js
//--------------------------------------------------
// Escapa caracteres HTML especiales para evitar XSS
function esc(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

//--------------------------------------------------
// Formatea fecha/hora: si es hoy, solo hora; si es otro día, fecha + hora
function time(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();

    if (sameDay) {
      return d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return (
        d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short'
        }) +
        ' ' +
        d.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    }
  } catch {
    return '';
  }
}

//--------------------------------------------------
// Genera un color único y consistente por usuario
function colorFromUserId(userId) {
  if (!userId) return '#9ca3af'; // gris por defecto

  // Hash simple y determinístico
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convertimos a HSL para colores agradables
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

//--------------------------------------------------
// Filtros (no se toca)
export function bindFilters({ rootEl, onChange }) {
  if (!rootEl) return;
  rootEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    rootEl
      .querySelectorAll('button')
      .forEach(b => b.classList.remove('chip-active'));
    btn.classList.add('chip-active');
    onChange(btn.dataset.filter || 'all');
  });
}

//--------------------------------------------------
// Renderiza todos los mensajes
export function renderMessages({ containerEl, messages, myUsuarioId }) {
  if (!containerEl) return;

  containerEl.innerHTML = messages
    .map(m => {
      const sys = !!m.is_system;
      const mine = Number(m.usuario?.id) === Number(myUsuarioId);
      const cls = sys ? 'system' : mine ? 'mine' : '';

      const nombre = sys
        ? 'Sistema'
        : m.usuario?.nombre?.split(' ')[0] || 'Usuario';

      const color = sys
        ? '#f59e0b' // amarillo sistema
        : colorFromUserId(m.usuario?.id);

      return `
        <div class="chat-row ${cls}">
          <div class="chat-meta">
            <strong style="color:${color}">
              ${esc(nombre)}
            </strong>
            <span class="muted">
              ${m.created_at ? time(m.created_at) : ''}
            </span>
          </div>
          <div class="chat-bubble">
            ${esc(m.mensaje || '')}
          </div>
        </div>
      `;
    })
    .join('');
}

//--------------------------------------------------
// Scroll helpers
export function isBottom(el) {
  return !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
}

export function toBottom(el) {
  if (el) el.scrollTop = el.scrollHeight;
}
