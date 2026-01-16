// frontend/assets/js/config.js

// Microservicios (producción)
const API_URL  = 'https://app-service-phi.vercel.app';
const AUTH_URL = 'https://siempregana-auth-service.vercel.app';

// Chat Service (por ahora local; cuando lo despliegues cambias esta URL)
const CHAT_URL = 'https://chat-service-six.vercel.app';

// Supabase (para Realtime en el frontend)
const SUPABASE_URL = 'https://wbtphqctdvyejjtgucuk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidHBocWN0ZHZ5ZWpqdGd1Y3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODkyNTMsImV4cCI6MjA3OTM2NTI1M30.fZ5UxsYaEoF058bgWQDnFaow0zHJwI64G3nvrGmSLvQ';

// Exponer al objeto global (para scripts type="module")
window.API_URL  = API_URL;
window.AUTH_URL = AUTH_URL;

// NUEVO:
window.CHAT_URL = CHAT_URL;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
