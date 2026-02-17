// frontend/assets/js/app-config.js
// Configuracion publica en runtime para el frontend.
// Puedes sobreescribir estos valores en deploy si necesitas.
// IMPORTANTE: aqui solo van valores publicos del cliente.
// NUNCA pongas JWT_SECRET, DATABASE_URL ni SUPABASE_SERVICE_ROLE_KEY.
window.__APP_CONFIG__ = {
  API_URL: 'https://app-service-phi.vercel.app',
  AUTH_URL: 'https://siempregana-auth-service.vercel.app',
  CHAT_URL: 'https://chat-service-theta.vercel.app',
  SUPABASE_URL: 'https://wbtphqctdvyejjtgucuk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidHBocWN0ZHZ5ZWpqdGd1Y3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODkyNTMsImV4cCI6MjA3OTM2NTI1M30.fZ5UxsYaEoF058bgWQDnFaow0zHJwI64G3nvrGmSLvQ'
};

