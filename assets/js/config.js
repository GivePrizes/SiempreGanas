// frontend/assets/js/config.js
// Carga de config publica en runtime.
// Recomendado: definir window.__APP_CONFIG__ antes de este script.
const runtime = window.__APP_CONFIG__ || {};

const API_URL = runtime.API_URL || 'https://app-service-phi.vercel.app';
const AUTH_URL = runtime.AUTH_URL || 'https://siempregana-auth-service.vercel.app';
const CHAT_URL = runtime.CHAT_URL || 'https://chat-service-theta.vercel.app';

// Valores publicos requeridos por cliente (no usar aqui service role keys)
const SUPABASE_URL = runtime.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = runtime.SUPABASE_ANON_KEY || '';
const NEQUI_PAYMENT_LINKS = runtime.NEQUI_PAYMENT_LINKS || {};
const NEQUI_KEYS = runtime.NEQUI_KEYS || {};
const NEQUI_KEY = runtime.NEQUI_KEY || '';
const NEQUI_PHONE = runtime.NEQUI_PHONE || runtime.NEQUI_NUMBER || '3045538465';
const NEQUI_HOLDER_NAME = runtime.NEQUI_HOLDER_NAME || '';
const NEQUI_HOLDER_NAMES = runtime.NEQUI_HOLDER_NAMES || {};

window.API_URL = API_URL;
window.AUTH_URL = AUTH_URL;
window.CHAT_URL = CHAT_URL;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.NEQUI_PAYMENT_LINKS = NEQUI_PAYMENT_LINKS;
window.NEQUI_KEYS = NEQUI_KEYS;
window.NEQUI_KEY = NEQUI_KEY;
window.NEQUI_PHONE = NEQUI_PHONE;
window.NEQUI_NUMBER = NEQUI_PHONE;
window.NEQUI_HOLDER_NAME = NEQUI_HOLDER_NAME;
window.NEQUI_HOLDER_NAMES = NEQUI_HOLDER_NAMES;

// =========================================================
// Auth helpers (no confiar en localStorage.user)
// =========================================================
(function initAuthHelpers() {
  let cachedUser = null;
  let cachedToken = null;
  let inflight = null;

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const rol = user.rol || user.role || '';
    const role = user.role || user.rol || '';
    return { ...user, rol, role };
  }

  async function fetchAuthUser({ force = false } = {}) {
    const token = localStorage.getItem('token');
    if (!token) return null;

    if (!force && cachedUser && cachedToken === token) return cachedUser;
    if (!force && inflight) return inflight;

    inflight = fetch(`${AUTH_URL}/api/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return normalizeUser(data?.user || null);
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });

    const user = await inflight;
    if (user) {
      cachedUser = user;
      cachedToken = token;
      window.__AUTH_USER__ = user;
    }
    return user;
  }

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  }

  window.getAuthUser = fetchAuthUser;
  window.requireAuthUser = async function requireAuthUser(options = {}) {
    const user = await fetchAuthUser({ force: options.force === true });
    if (!user) {
      if (options.clear !== false) clearSession();
      if (options.redirectTo) location.href = options.redirectTo;
    }
    return user;
  };
  window.clearSession = clearSession;
})();
