# Arquitectura Auth + Login

## Objetivo

Mantener el acceso como una frontera clara entre frontend y `auth-service`, sin mezclar identidad, sesión y UI en un solo archivo gigante.

## Qué es microservicio aquí

`siempregana-auth-service` ya funciona como microservicio de autenticación porque:

- tiene responsabilidad única sobre identidad y sesión
- expone su propio contrato HTTP
- se despliega por separado
- el frontend lo consume vía `AUTH_URL`

Todavía no es un microservicio completamente desacoplado a nivel de datos, porque comparte base de datos con otros módulos. Pero a nivel de dominio y despliegue sí está separado.

## Flujo oficial

1. `login.html` recoge credenciales o datos de registro.
2. El frontend llama a `POST /api/auth/login` o `POST /api/auth/registro`.
3. Guarda el `token` devuelto.
4. Refresca identidad real con `GET /api/auth/validate`.
5. Redirige por rol:
   `admin` -> `admin/panel.html`
   participante -> `participante/dashboard.html`

## Estructura frontend aplicada

- `login.html`: vista de acceso
- `assets/css/login.css`: estilos propios de la pantalla de acceso, incluyendo el sistema de tema claro/oscuro
- `assets/js/auth.js`: utilidades compartidas de auth en frontend
- `assets/js/auth/login.js`: flujo de inicio de sesión
- `assets/js/auth/registro.js`: flujo de registro y validaciones del formulario
- `assets/js/auth/login-page.js`: comportamiento visual y de navegación de la página
- `assets/js/auth/login-theme.js`: selector de tema y persistencia de preferencia visual

## Tema claro/oscuro y frontera del microservicio

El selector de tema pertenece solo al frontend. Su responsabilidad es visual:

- leer la preferencia guardada en `localStorage`
- respetar el tema del sistema cuando el usuario no ha elegido uno
- aplicar `data-login-theme="light|dark"` sobre el documento

Este comportamiento no hace llamadas nuevas a `auth-service`, no cambia contratos HTTP y no mueve lógica de autenticación fuera del microservicio. Es una capacidad de experiencia de usuario, no de identidad.

## Qué se logró con esta separación

- `login.html` deja de cargar casi toda la lógica inline
- `login` y `registro` quedan desacoplados entre sí
- `logout()` sigue disponible para el resto del frontend
- el contrato con `auth-service` no cambia
- el tema visual se documenta y queda encapsulado en un módulo propio

## Endpoints usados

- `POST /api/auth/login`
- `POST /api/auth/registro`
- `GET /api/auth/validate`

## Próximos pasos sanos

- extraer el modal de términos a un partial o componente reutilizable
- mover mensajes de error y textos de UI a constantes centralizadas
- agregar smoke tests del flujo `login -> validate -> redirect`
- documentar permisos admin derivados de `ADMINS_CUENTAS_EMAILS` y `ADMINS_PAGOS_EMAILS`
