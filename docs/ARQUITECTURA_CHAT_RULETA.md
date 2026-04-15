# Arquitectura Chat + Ruleta

## Objetivo

Mantener una sola sala oficial por sorteo para evitar rutas duplicadas, estados inconsistentes y chats paralelos.

## Ruta oficial del participante

- Entrada principal: [ruleta-live.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/ruleta-live.html)
- Pantalla de compra: [sorteo.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/sorteo.html) solo enlaza a la sala en vivo

## Responsabilidades

### Frontend

- Monta una sola UI de conversacion en la ruleta en vivo.
- Usa `sorteoId` como identificador unico de sala.
- Bloquea escritura si el usuario no tiene numero aprobado.

### app-service

- Entrega estado de la ruleta.
- Entrega los numeros aprobados del participante.
- Sigue siendo la fuente de verdad para permiso funcional de participacion.

### chat-service

- Entrega historial del chat.
- Recibe mensajes nuevos.
- Publica stream en tiempo real por `sorteoId`.

## Reglas implementadas

- Solo los participantes aprobados escriben.
- Cualquier usuario autenticado puede ver el stream del chat en vivo.
- El frontend siempre envia JWT en historial y stream.
- El frontend normaliza los mensajes para evitar diferencias entre historial, realtime y respuestas del backend.

## Archivos clave

- [chatApi.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/chat/chatApi.js)
- [index.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/chat/index.js)
- [ruleta-live-chat.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/participante/ruleta-live-chat.js)
- [ruleta-live.js](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/assets/js/participante/ruleta-live.js)
- [chat.js](/d:/carpetaRuleta2026/siempregana-chat-service/chat-service/api/routes/chat.js)

## Deuda tecnica visible

- Hay controladores y rutas de chat legacy que conviene aislar o retirar despues de verificar uso real.
- El sistema todavia depende de una base compartida y no de eventos entre servicios.
