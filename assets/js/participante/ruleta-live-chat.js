import { initChat } from '../chat/index.js?v=20260422c';

const API_URL = (window.API_URL || '').replace(/\/$/, '');
let hasApprovedAccess = false;
let phaseWriteEnabled = false;
let lastHintMessage = '';

function getEls() {
  return {
    container: document.getElementById('chatContainer'),
    input: document.getElementById('chatInput'),
    send: document.getElementById('chatSend'),
    hint: document.getElementById('chatHint')
  };
}

function syncLiveChatPermission(messageOverride) {
  const { input, send, hint } = getEls();
  const canWrite = hasApprovedAccess && phaseWriteEnabled;
  const message = typeof messageOverride === 'string' ? messageOverride : lastHintMessage;

  if (typeof window.setParticipantChatPermission === 'function') {
    window.setParticipantChatPermission({ canWrite, message });
  } else {
    if (input) input.disabled = !canWrite;
    if (send) send.disabled = !canWrite;
    if (hint && typeof message === 'string') {
      hint.textContent = message;
    }
  }
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
      message: 'Solo quienes tengan una participacion aprobada pueden escribir.'
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
  hasApprovedAccess = canWrite === true;
  if (typeof message === 'string') {
    lastHintMessage = message;
  }
  syncLiveChatPermission(message);
};

window.initRuletaLiveChat = async function initRuletaLiveChat({
  sorteoId,
  token,
  writeAccess = null,
} = {}) {
  if (!sorteoId || !token) return;

  const { container } = getEls();
  if (container) container.style.display = 'flex';

  const access = writeAccess && typeof writeAccess === 'object'
    ? writeAccess
    : await resolveWriteAccess({ sorteoId, token });
  window.setRuletaLiveChatWriteAccess(access);

  try {
    await initChat({ sorteoId, token });
    syncLiveChatPermission(access?.message || lastHintMessage);
  } catch {
    const { hint } = getEls();
    if (hint) hint.textContent = 'No se pudo cargar el chat.';
  }
};

window.setRuletaLiveChatState = function setRuletaLiveChatState({ enabled, message } = {}) {
  if (typeof enabled === 'boolean') {
    phaseWriteEnabled = enabled;
  }

  if (typeof message === 'string') {
    lastHintMessage = message;
  }

  syncLiveChatPermission(message);
};
