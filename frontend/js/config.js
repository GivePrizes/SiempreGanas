// ========== CONFIG.JS - URLs de tu Render ==========
// este archivo en: D:\SiempreGanas\frontend\js\config.js

export const API_CONFIG = {
    AUTH_SERVICE: 'https://auth-service-v5sb.onrender.com',
    APP_SERVICE: 'https://app-service-kupj.onrender.com',
    TIMEOUT: 10000,
    TOKEN_KEY: 'siempregana_token',
    REFRESH_TOKEN_KEY: 'siempregana_refresh'
};

export const ENDPOINTS = {
    // Auth
    REGISTRO: '/api/auth/registro',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    VALIDATE: '/api/auth/validate',
    REFRESH: '/api/auth/refresh',
    
    // Sorteos
    GET_SORTEOS: '/api/sorteos',
    GET_SORTEO: '/api/sorteos/:id',
    GET_NUMEROS_OCUPADOS: '/api/sorteos/:id/numeros-ocupados',
    CREAR_SORTEO: '/api/sorteos',
    
    // Participación
    GUARDAR_NUMEROS: '/api/participante/guardar-numeros',
    GET_PARTICIPACIONES: '/api/participante/mis-participaciones',
    
    // Admin
    GET_COMPROBANTES: '/api/admin/comprobantes',
    APROBAR_COMPROBANTE: '/api/admin/comprobantes/accion'
};

export function getFullUrl(service, endpoint) {
    const baseUrl = service === 'auth' ? API_CONFIG.AUTH_SERVICE : API_CONFIG.APP_SERVICE;
    return `${baseUrl}${endpoint}`;
}