# SiempreGanas Frontend

Frontend del participante y administración para la plataforma SiempreGanas.

## Stack real

- HTML, CSS y JavaScript vanilla
- Servicios backend Node.js/Express desplegados por separado
- PostgreSQL/Supabase como base de datos compartida

## Flujo oficial de chat y ruleta

- La única sala oficial del participante es [ruleta-live.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/ruleta-live.html).
- [chat.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/chat.html) queda solo como redirección de compatibilidad.
- [sorteo.html](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/participante/sorteo.html) ya no monta un chat propio ni abre una sala separada.

## Documentación recomendada

- [ARQUITECTURA_GENERAL.md](/d:/carpetaRuleta2026/ARQUITECTURA_GENERAL.md)
- [ARQUITECTURA_CHAT_RULETA.md](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/docs/ARQUITECTURA_CHAT_RULETA.md)
- [ARQUITECTURA_AUTH_LOGIN.md](/d:/carpetaRuleta2026/SiempreGanas/frontend/frontend/docs/ARQUITECTURA_AUTH_LOGIN.md)

## Desarrollo local

Puedes servir esta carpeta con cualquier servidor estático. Ejemplo:

```bash
cd SiempreGanas/frontend/frontend
python -m http.server 3000
```

Luego abre `http://localhost:3000`.
