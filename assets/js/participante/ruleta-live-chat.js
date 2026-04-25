import { initChat } from '../chat/index.js?v=20260422c';

let hasApprovedAccess = false;
let phaseWriteEnabled = false;
let lastHintMessage = '';

function getEls() {
  return {
    container: document.getElementById('chatContainer'),
    input: document.getElementById('chatInput'),
    send: document.getElementById('chatSend'),
    hint: document.getElementById('chatHint'),
  };
}

function syncLiveChatPermission(messageOverride) {
  const { input, send, hint } = getEls();
  const canWrite = hasApprovedAccess && phaseWriteEnabled;
  const message = typeof messageOverride === 'string' ? messageOverride : lastHintMessage;

  if (typeof window.setParticipantChatPermission === 'function') {
    window.setParticipantChatPermission({ canWrite, message });
    return;
  }

  if (input) input.disabled = !canWrite;
  if (send) send.disabled = !canWrite;
  if (hint && typeof message === 'string') {
    hint.textContent = message;
  }
}

function getDefaultWriteAccess({ sorteoId, token }) {
  if (!sorteoId || !token) {
    return {
      canWrite: false,
      message: 'Inicia sesión para escribir en la sala.',
    };
  }

  return { canWrite: true, message: '' };
}

window.setRuletaLiveChatWriteAccess = function setRuletaLiveChatWriteAccess({
  canWrite,
  message,
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

  const { container, hint } = getEls();
  if (container) container.style.display = 'flex';

  const access = writeAccess && typeof writeAccess === 'object'
    ? writeAccess
    : getDefaultWriteAccess({ sorteoId, token });
  window.setRuletaLiveChatWriteAccess(access);

  try {
    await initChat({ sorteoId, token });
    syncLiveChatPermission(access?.message || lastHintMessage);
  } catch {
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
