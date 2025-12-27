// assets/js/admin/cuentas/index.js
import { normalizeCuentasApi } from './adapter.js';
import { renderAcordeon } from './render.js';

const API_URL = window.API_URL || '';

export async function cargarCuentas() {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('No hay token');
    return;
  }

  const r = await fetch(`${API_URL}/api/admin/cuentas/sorteos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!r.ok) {
    console.error('Error cargando cuentas:', r.status);
    return;
  }

  const raw = await r.json();
  const data = normalizeCuentasApi(raw);

  console.log('RAW API:', raw);
  console.log('NORMALIZED:', data);

  renderAcordeon(data);
}

// ✅ Ejecutar al cargar la página + botón refrescar
document.addEventListener('DOMContentLoaded', () => {
  cargarCuentas();

  const btn = document.getElementById('btnRefrescar');
  if (btn) btn.addEventListener('click', cargarCuentas);
});
