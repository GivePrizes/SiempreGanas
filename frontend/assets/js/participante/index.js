// assets/js/participante/index.js
import { cargarSorteos } from './sorteos.js';
import { cargarMisNumerosResumen } from './misNumeros.js';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user.id) {
    location.href = '../index.html';
    return;
  }

  // Saludo psicológico: usar solo primer nombre
  const titulo = document.getElementById('tituloBienvenida');
  if (titulo) {
    const partes = (user.nombre || '').trim().split(' ').filter(Boolean);
    const nombre = partes[0] || 'Jugador';
    titulo.textContent = `Hola, ${nombre} 👋`;
  }

  // Iniciar módulos
  cargarSorteos();
  cargarMisNumerosResumen();
});
