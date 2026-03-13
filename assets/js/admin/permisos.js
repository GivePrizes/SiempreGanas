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
  const cachedUser = window.__AUTH_USER__ || null;
  const permisos = Array.isArray(cachedUser?.permisos)
    ? cachedUser.permisos
    : (Array.isArray(getTokenPayload()?.permisos) ? getTokenPayload().permisos : []);
  return permisos.includes(perm);
}

export function hasAnyPerm(perms = []) {
  return perms.some(hasPerm);
}
