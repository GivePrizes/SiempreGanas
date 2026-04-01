# Arquitectura De Tema Frontend

## Objetivo

Mantener un sistema de tema claro/oscuro compartido en todo el frontend sin tocar contratos de `app-service`, `auth-service` ni `chat-service`.

## Qué hace

- guarda la preferencia visual del usuario en `localStorage` bajo `mathome-theme`
- aplica el atributo `data-app-theme="light|dark"` al documento
- reutiliza un botón flotante global en participante y admin
- respeta el tema del sistema cuando el usuario no ha elegido uno

## Archivos base

- `assets/js/theme-init.js`: aplica el tema antes del render para evitar parpadeos
- `assets/js/theme.js`: sincroniza botones, persistencia e inyección del selector global
- `assets/css/theme.css`: define variables y overrides visuales para vistas compartidas, chat y ruletas

## Frontera con microservicios

Este sistema vive por completo en el frontend:

- no hace peticiones nuevas a backend
- no altera `AUTH_URL`, `API_URL` ni `CHAT_URL`
- no mezcla responsabilidades de UI con autenticación o lógica de negocio

Es una capacidad de experiencia visual, no un cambio de arquitectura de microservicios.
