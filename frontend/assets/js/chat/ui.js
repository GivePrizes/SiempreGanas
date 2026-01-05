//chat UI helpers
//--------------------------------------------------
// Escapa caracteres HTML especiales para evitar XSS
//D:\carpetaRuleta2026\SiempreGanas\frontend\assets\js\chat\ui.js
function esc(s=''){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function time(iso){ try { return new Date(iso).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); } catch { return ''; } }

export function bindFilters({ rootEl, onChange }) {
  if (!rootEl) return;
  rootEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    rootEl.querySelectorAll('button').forEach(b => b.classList.remove('chip-active'));
    btn.classList.add('chip-active');
    onChange(btn.dataset.filter || 'all');
  });
}

export function renderMessages({ containerEl, messages, myUsuarioId }) {
  if (!containerEl) return;
  containerEl.innerHTML = messages.map(m => {
    const mine = Number(m.usuario_id) === Number(myUsuarioId);
    const sys = !!m.is_system;
    const cls = sys ? 'system' : (mine ? 'mine' : '');
    const nombre = sys ? 'Sistema' : (m.usuario_id ? `Usuario #${m.usuario_id}` : 'Usuario');
    return `
      <div class="chat-row ${cls}">
        <div class="chat-meta">
          <strong>${nombre}</strong>
          <span class="muted">${m.created_at ? time(m.created_at) : ''}</span>
        </div>
        <div class="chat-bubble">${esc(m.mensaje || '')}</div>
      </div>`;
  }).join('');
}

export function isBottom(el){ return !el || (el.scrollTop + el.clientHeight >= el.scrollHeight - 20); }
export function toBottom(el){ if (el) el.scrollTop = el.scrollHeight; }
