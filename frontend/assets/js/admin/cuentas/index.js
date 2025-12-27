import { renderAcordeon } from './render.js';
const API_URL = window.API_URL || '';

export async function cargarCuentas() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const r = await fetch(`${API_URL}/api/admin/cuentas/sorteos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const raw = await r.json();
  renderAcordeon(raw);
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCuentas();
  const btn = document.getElementById('btnRefrescar');
  if (btn) btn.addEventListener('click', cargarCuentas);
});
