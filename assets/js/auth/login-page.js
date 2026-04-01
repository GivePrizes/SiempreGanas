const REDUCE_VISUAL_LOAD = false;

function showRegistro() {
  document.getElementById('loginForm')?.classList.add('hidden');
  document.getElementById('registroForm')?.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLogin() {
  document.getElementById('registroForm')?.classList.add('hidden');
  document.getElementById('loginForm')?.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initStoryBubbles() {
  if (REDUCE_VISUAL_LOAD) return;

  const leftLane = document.getElementById('storyLaneLeft');
  const rightLane = document.getElementById('storyLaneRight');
  if (!leftLane || !rightLane) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const users = ['Alex', 'Naty', 'Fer', 'Sofi', 'Leo', 'Majo', 'Dani', 'Pipe', 'Lina', 'Meli'];
  const messages = [
    'Listo el combo para peli, esperando que gire la suerte.',
    'Entrando a sala, hoy sí cae el premio grande.',
    'Ya prendimos la peli, avisen cuando arranque la ruleta.',
    'Equipo completo en chat, que se active el giro.',
    'Mi número está caliente, esta noche toca.',
    'Se siente la energía, a esperar el giro final.',
    'Todo en vivo, snacks listos y ojos en la suerte.',
    'Conectado desde ya, pendiente del próximo giro.',
    'Hoy se ve buena racha, vamos con toda.',
    'Nada de dormirse, que la suerte aparece rápido.',
  ];

  function createBubble(lane) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-float';
    bubble.style.setProperty('--x', `${6 + Math.random() * 58}%`);
    bubble.style.setProperty('--drift', `${-28 + Math.random() * 56}px`);
    bubble.style.setProperty('--dur', `${9 + Math.random() * 6}s`);
    bubble.style.setProperty('--delay', `${Math.random() * 1.8}s`);

    const user = users[Math.floor(Math.random() * users.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const initials = user.slice(0, 2).toUpperCase();

    bubble.innerHTML = `
      <div class="chat-avatar">${initials}</div>
      <div class="chat-bubble">
        <span class="chat-user">${user}</span>
        ${message}
      </div>
    `;

    bubble.addEventListener('animationend', () => bubble.remove());
    lane.appendChild(bubble);
  }

  function pickLane() {
    if (window.innerWidth < 700) return leftLane;
    return Math.random() > 0.5 ? leftLane : rightLane;
  }

  for (let i = 0; i < 6; i += 1) {
    createBubble(pickLane());
  }

  setInterval(() => {
    createBubble(pickLane());
  }, 1300);
}

function initLiveTracker() {
  if (REDUCE_VISUAL_LOAD) return;

  const thread = document.getElementById('liveTrackerThread');
  const typing = document.getElementById('liveTrackerTyping');
  const count = document.getElementById('liveTrackerCount');
  if (!thread || !typing || !count) return;

  const queue = [
    { side: 'host', text: 'Entramos en cuenta regresiva para girar.' },
    { side: 'user', text: 'Activo, ya tengo mi numero listo.' },
    { side: 'host', text: 'Mientras esperan, comenten su prediccion.' },
    { side: 'user', text: 'Yo digo que hoy se prende la racha.' },
    { side: 'host', text: 'Se abre sala completa en segundos.' },
    { side: 'user', text: 'Con snacks y peli, no me pierdo este giro.' },
    { side: 'host', text: 'Chat encendido. Alerta de giro inminente.' },
    { side: 'user', text: 'Vamos con todo, que llegue la suerte.' },
  ];

  let index = 0;
  let online = 127;

  function pushMessage(item) {
    const node = document.createElement('div');
    node.className = `chat-msg ${item.side}`;
    node.textContent = item.text;
    thread.insertBefore(node, typing);

    while (thread.querySelectorAll('.chat-msg').length > 5) {
      thread.querySelector('.chat-msg')?.remove();
    }

    thread.scrollTop = thread.scrollHeight;
  }

  function randomCountDelta() {
    return Math.floor(Math.random() * 5) - 1;
  }

  setInterval(() => {
    typing.classList.add('is-visible');
    setTimeout(() => {
      typing.classList.remove('is-visible');
      pushMessage(queue[index]);
      index = (index + 1) % queue.length;
      online = Math.max(95, online + randomCountDelta());
      count.textContent = `${online} conectados`;
    }, 1200);
  }, 2600);
}

window.showRegistro = showRegistro;
window.showLogin = showLogin;

initStoryBubbles();
initLiveTracker();
