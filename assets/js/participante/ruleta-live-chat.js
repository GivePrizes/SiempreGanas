import { initChat } from '../chat/index.js';

function getEls() {
  return {
    container: document.getElementById('chatContainer'),
    input: document.getElementById('chatInput'),
    send: document.getElementById('chatSend'),
    hint: document.getElementById('chatHint')
  };
}

window.initRuletaLiveChat = async function initRuletaLiveChat({ sorteoId, token } = {}) {
  if (!sorteoId || !token) return;

  const { container } = getEls();
  if (container) container.style.display = 'flex';

  try {
    await initChat({ sorteoId, token });
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

  if (typeof enabled === 'boolean') {
    if (input) {
      if (!enabled) {
        input.disabled = true;
      } else {
        input.disabled = input.dataset.prevDisabled === '1';
      }
    }
    if (send) {
      if (!enabled) {
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
