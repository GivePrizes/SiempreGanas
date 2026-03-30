import { initChat } from '../chat/index.js?v=20260329b';

const API_URL = (window.API_URL || '').replace(/\/$/, '');

function getEls() {
  return {
    container: document.getElementById('chatContainer'),
    input: document.getElementById('chatInput'),
    send: document.getElementById('chatSend'),
    hint: document.getElementById('chatHint')
  };
}

async function resolveWriteAccess({ sorteoId, token }) {
  if (!API_URL || !sorteoId || !token) {
    return {
      canWrite: false,
      message: 'Inicia sesión y participa para escribir en la sala.'
    };
  }

  try {
    const res = await fetch(
      `${API_URL}/api/participante/mis-numeros?sorteoId=${encodeURIComponent(sorteoId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return {
        canWrite: false,
        message: 'No se pudo validar tu participación en esta ronda.'
      };
    }

    const data = await res.json();
    const numeros = Array.isArray(data?.numeros) ? data.numeros : [];

    if (numeros.length > 0) {
      return { canWrite: true, message: '' };
    }

    return {
      canWrite: false,
      message: 'Solo participantes con número aprobado pueden escribir.'
    };
  } catch {
    return {
      canWrite: false,
      message: 'No se pudo validar tu acceso al chat.'
    };
  }
}

window.setRuletaLiveChatWriteAccess = function setRuletaLiveChatWriteAccess({
  canWrite,
  message
} = {}) {
  const { input, send, hint } = getEls();
  const locked = canWrite === false;

  if (input) {
    input.dataset.forceDisabled = locked ? '1' : '0';
    if (locked) input.disabled = true;
  }

  if (send) {
    send.dataset.forceDisabled = locked ? '1' : '0';
    if (locked) send.disabled = true;
  }

  if (hint && typeof message === 'string') {
    hint.textContent = message;
  }
};

window.initRuletaLiveChat = async function initRuletaLiveChat({ sorteoId, token } = {}) {
  if (!sorteoId || !token) return;

  const { container } = getEls();
  if (container) container.style.display = 'flex';

  const access = await resolveWriteAccess({ sorteoId, token });
  window.setRuletaLiveChatWriteAccess(access);

  try {
    await initChat({ sorteoId, token });
    if (!access.canWrite) {
      window.setRuletaLiveChatWriteAccess(access);
    }
  } catch {
    const { hint } = getEls();
    if (hint) hint.textContent = 'No se pudo cargar el chat.';
  }
};

window.setRuletaLiveChatState = function setRuletaLiveChatState({ enabled, message } = {}) {
  const { input, send, hint } = getEls();

  if (input && input.dataset.prevDisabled == null) {
    input.dataset.prevDisabled = input.disabled ? '1' : '0';
  }
  if (send && send.dataset.prevDisabled == null) {
    send.dataset.prevDisabled = send.disabled ? '1' : '0';
  }

  const forceDisabled = input?.dataset.forceDisabled === '1' || send?.dataset.forceDisabled === '1';

  if (typeof enabled === 'boolean') {
    if (input) {
      if (!enabled || forceDisabled) {
        input.disabled = true;
      } else {
        input.disabled = input.dataset.prevDisabled === '1';
      }
    }
    if (send) {
      if (!enabled || forceDisabled) {
        send.disabled = true;
      } else {
        send.disabled = send.dataset.prevDisabled === '1';
      }
    }
  }

  if (hint && typeof message === 'string') {
    hint.textContent = message;
  }
};
