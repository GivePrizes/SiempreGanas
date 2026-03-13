// frontend/assets/js/chat/ui.js
//--------------------------------------------------
// Escapa caracteres HTML especiales (XSS safe)
function esc(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

//--------------------------------------------------
// Formato de hora inteligente
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
    }

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
  } catch {
    return '';
  }
}

//--------------------------------------------------
// Color único y consistente por usuario (UX clave)
function colorFromUserId(userId) {
  if (!userId) return '#9ca3af';

  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

//--------------------------------------------------
// Filtros (se mantiene simple y eficiente)
export function bindFilters({ rootEl, onChange }) {
  if (!rootEl) return;

  rootEl.addEventListener('click', e => {
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
// Render principal del chat
export function renderMessages({
  containerEl,
  messages,
  myUsuarioId,
  renderActions
}) {
  if (!containerEl) return;

  containerEl.innerHTML = messages
    .map(m => {
      const isSystem = !!m.is_system;
      const isMine = Number(m.usuario?.id) === Number(myUsuarioId);
      const displayName =
        m.usuario?.alias ??
        m.usuario?.nombre ??
        m.usuario_alias ??
        m.usuario_nombre ??
        'Usuario';

      const cls = [
        'chat-row',
        isSystem ? 'system' : '',
        isMine ? 'mine' : '',
        m.pinned ? 'pinned' : '',
        m.deleted ? 'deleted' : ''
      ].filter(Boolean).join(' ');

      if (m.deleted) {
        return `
          <div class="${cls}">
            <div class="chat-bubble muted italic">
              Mensaje eliminado por el administrador
            </div>
          </div>
        `;
      }

      return `
        <div class="${cls}">
          <div class="chat-meta">
            <strong class="chat-author">
              ${esc(displayName)}
            </strong>
            <span class="chat-time">
              ${m.created_at ? time(m.created_at) : ''}
            </span>
          </div>

          <div class="chat-bubble">
            ${esc(m.mensaje || '')}
          </div>

          ${
            typeof renderActions === 'function'
              ? `<div class="chat-actions">
                   ${renderActions(m)}
                 </div>`
              : ''
          }
        </div>
      `;
    })
    .join('');
}


//--------------------------------------------------
// Scroll helpers (clave para sensación realtime)
export function isBottom(el) {
  return (
    !el ||
    el.scrollTop + el.clientHeight >= el.scrollHeight - 20
  );
}

export function toBottom(el) {
  if (el) el.scrollTop = el.scrollHeight;
}
//--------------------------------------------------
