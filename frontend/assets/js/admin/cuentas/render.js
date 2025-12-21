export function renderAcordeon(sorteos) {
  const cont = document.getElementById('acordeonCuentas');
  if (!cont) return;

  cont.innerHTML = '';

  sorteos.forEach(s => {
    const div = document.createElement('div');
    div.className = 'acordeon-sorteo';

    div.innerHTML = `
      <h3>${s.descripcion}</h3>
      <small>Pendientes: ${s.resumen.pendientes} · Entregadas: ${s.resumen.entregadas}</small>
      <div>
        ${s.participantes.map(p => `
          <div class="participante">
            <strong>${p.nombre}</strong>
            <div>Números: ${p.numeros.join(', ') || '-'}</div>
            <button data-sorteo="${s.sorteoId}" data-user="${p.usuarioId}">
              Marcar entregada
            </button>
          </div>
        `).join('')}
      </div>
    `;

    cont.appendChild(div);
  });
}
