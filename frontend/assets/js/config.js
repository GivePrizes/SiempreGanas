// frontend/assets/js/config.js

// Microservicios (producción)
const API_URL  = 'https://app-service-phi.vercel.app';
const AUTH_URL = 'https://siempregana-auth-service.vercel.app';

// Chat Service (por ahora local; cuando lo despliegues cambias esta URL)
const CHAT_URL = 'http://127.0.0.1:3005';

// Supabase (para Realtime en el frontend)
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';

// Exponer al objeto global (para scripts type="module")
window.API_URL  = API_URL;
window.AUTH_URL = AUTH_URL;

// NUEVO:
window.CHAT_URL = CHAT_URL;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
