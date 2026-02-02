// frontend/assets/js/admin/cuentas/api.js
const API_URL = window.API_URL || '';

function tokenOrThrow() {
  const t = localStorage.getItem('token');
  if (!t) throw new Error('No hay token');
  return t;
}

export async function fetchCuentasPorSorteos() {
  const token = tokenOrThrow();
  const res = await fetch(`${API_URL}/api/admin/cuentas/sorteos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`GET /cuentas/sorteos ${res.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

export async function patchMarcarEntregada(sorteoId, usuarioId) {
  const token = tokenOrThrow();

  const res = await fetch(
    `${API_URL}/api/admin/cuentas/sorteos/${sorteoId}/usuarios/${usuarioId}/entregar`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`PATCH entregar ${res.status}: ${text}`);
  }

  return text ? JSON.parse(text) : { success: true };
}
