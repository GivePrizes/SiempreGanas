export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

export function confeti() {
  const piece = document.createElement("div");
  piece.style.position = "fixed";
  piece.style.left = "50%";
  piece.style.top = "20%";
  piece.style.width = "6px";
  piece.style.height = "12px";
  piece.style.background = ["#FFD700","#E50914","#fff"][Math.floor(Math.random()*3)];
  piece.style.transform = `translateX(${(Math.random()*200-100)}px) rotate(${Math.random()*360}deg)`;
  piece.style.transition = "all 1200ms ease-out";
  document.body.appendChild(piece);
  requestAnimationFrame(() => {
    piece.style.top = "80%";
    piece.style.opacity = "0";
  });
  setTimeout(() => piece.remove(), 1400);
}