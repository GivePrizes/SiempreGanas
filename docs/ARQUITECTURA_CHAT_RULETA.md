# Arquitectura Chat + Ruleta

## Objetivo

Mantener una sola sala oficial por sorteo para evitar rutas duplicadas, estados inconsistentes y chats paralelos.

## Ruta oficial del participante

- Entrada principal: [ruleta-live.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/ruleta-live.html)
- Compatibilidad legacy: [chat.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/chat.html) redirige a la ruleta
- Pantalla de compra: [sorteo.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/sorteo.html) solo enlaza a la sala en vivo

## Responsabilidades

### Frontend

- Monta una sola UI de conversación en la ruleta en vivo.
- Usa `sorteoId` como identificador único de sala.
- Bloquea escritura si el usuario no tiene número aprobado.

### app-service

- Entrega estado de la ruleta.
- Entrega los números aprobados del participante.
- Sigue siendo la fuente de verdad para permiso funcional de participación.

### chat-service

- Entrega historial del chat.
- Recibe mensajes nuevos.
- Publica stream en tiempo real por `sorteoId`.

## Reglas implementadas

- Solo los participantes aprobados escriben.
- Cualquier usuario autenticado puede ver el stream del chat en vivo.
- El frontend siempre envía JWT en historial y stream.
- El frontend normaliza los mensajes para evitar diferencias entre historial, realtime y respuestas del backend.

## Archivos clave

- [chatApi.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/chat/chatApi.js)
- [index.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/chat/index.js)
- [ruleta-live-chat.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/participante/ruleta-live-chat.js)
- [ruleta-live.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/participante/ruleta-live.js)
- [chat.js](/d:/carpetaRuleta2026/siempregana-chat-service/chat-service/api/routes/chat.js)

## Deuda técnica visible

- Hay controladores y rutas de chat legacy que conviene aislar o retirar después de verificar uso real.
- El sistema todavía depende de una base compartida y no de eventos entre servicios.
