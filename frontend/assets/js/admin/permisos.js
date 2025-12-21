// assets/js/admin/permisos.js

export function getTokenPayload() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function hasPerm(perm) {
  const payload = getTokenPayload();
  const permisos = Array.isArray(payload?.permisos) ? payload.permisos : [];
  return permisos.includes(perm);
}

export function hasAnyPerm(perms = []) {
  return perms.some(hasPerm);
}
