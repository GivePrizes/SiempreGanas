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

window.API_URL = API_URL;
window.AUTH_URL = AUTH_URL;
window.CHAT_URL = CHAT_URL;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
