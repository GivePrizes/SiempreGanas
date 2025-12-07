// URL de tu backend en producción
const API_URL = 'https://app-service-phi.vercel.app';
const AUTH_URL = 'https://siempregana-auth-service.vercel.app'; // tu Auth Service

// 🔴 IMPORTANTE: exponerlas al objeto global para que los <script type="module"> las vean
window.API_URL  = API_URL;
window.AUTH_URL = AUTH_URL;