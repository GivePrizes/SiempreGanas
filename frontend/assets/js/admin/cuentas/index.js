import { renderAcordeon } from './render.js';

const API_URL = window.API_URL || '';

export async function cargarCuentas() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const r = await fetch(`${API_URL}/api/admin/cuentas/sorteos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!r.ok) {
    console.error('Error cargando cuentas:', r.status);
    return;
  }

  const raw = await r.json();
  renderAcordeon(raw); // ✅ DIRECTO
}
