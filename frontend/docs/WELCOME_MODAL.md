# 🎉 Welcome Modal - Documentación

## Descripción General

Sistema de modal de bienvenida premium para "SIEMPRE GANAS" que se muestra automáticamente cuando un usuario:
- Se registra por primera vez
- Inicia sesión

## Características ✨

### Funcionalidad
- ✅ Se muestra una sola vez por dispositivo (localStorage)
- ✅ Compatible con login y registro
- ✅ No bloquea la navegación después de cerrar
- ✅ Cierre elegante con botón X
- ✅ Cierre con overlay (click fuera del modal)
- ✅ Cierre con tecla ESC
- ✅ Delay de 2 segundos antes de redirigir (permite ver el modal)

### Diseño
- 🎨 Tema premium: Dorado (#f6d06f) + Oscuro
- 🎨 Animación suave de entrada (fade + scale)
- 🎨 Imagen promocional con glow suave
- 🎨 Responsive: Desktop, Tablet, Mobile
- 🎨 Backdrop blur para mejor legibilidad

### Contenido
- **Título**: "Bienvenido a SIEMPRE GANAS" (gradient dorado)
- **Subtítulo**: "Disfruta contenido premium, participa en chats en vivo y gana premios reales"
- **Beneficios**: 
  - ✓ Cuentas originales
  - ✓ Comunidad en sorteos
  - ✓ Premios garantizados
- **Urgencia**: "⚡ HASTA AGOTAR EXISTENCIAS"
- **CTA**: Botón "¡Comienza ahora!" (cierra modal)

## Archivos Incluidos

### 1. **assets/js/welcomeModal.js**
Clase `WelcomeModal` que gestiona:
- Creación del HTML del modal
- Mostrar/ocultar con animaciones
- Persistencia en localStorage
- Event listeners para cierre

**Métodos públicos:**
```javascript
// Mostrar modal (respeta flag de localStorage)
showWelcomeModal()

// Mostrar forzadamente (ignora flag)
showWelcomeModal(true)

// Resetear flag y mostrar nuevamente (para testing)
resetWelcomeModal()
```

### 2. **assets/css/participant.css**
Estilos CSS incluidos:
- `.welcome-modal-container` - Contenedor principal
- `.welcome-modal-content` - Contenido del modal
- `.welcome-modal-close` - Botón cerrar
- `.welcome-modal-image-wrapper` - Wrapper de imagen
- `.welcome-modal-text` - Contenido de texto
- Animaciones: `welcomeModalSlideIn`
- Media queries para responsive

### 3. **login.html**
- Agregado: `<script src="assets/js/welcomeModal.js"></script>`

### 4. **auth.js** (Modificado)
- Login: Llama `showWelcomeModal()` antes de redirigir
- Registro: Llama `showWelcomeModal()` antes de redirigir
- Delay de 2s permite ver el modal

### 5. **Otros HTML** (Participante)
Agregado el script en:
- `participante/dashboard.html`
- `participante/mis-numeros.html`
- `participante/ruleta-live.html`
- `participante/sorteo.html`

## Flujo de Uso

### Scenario 1: Primer Login
```
1. Usuario abre login.html
2. Ingresa credenciales
3. Backend devuelve token + user
4. auth.js guarda en localStorage
5. showWelcomeModal() se ejecuta
6. Modal aparece con animación
7. Usuario puede:
   - Cerrar con X
   - Cerrar haciendo click en overlay
   - Cerrar con ESC
   - Hacer click en "¡Comienza ahora!"
8. Después de 2s, redirige a dashboard
9. localStorage['welcomeModal_shown_v1'] = 'true'
10. Próximos logins no muestran el modal
```

### Scenario 2: Forzar Mostrar (Testing)
```javascript
// En la consola del navegador:
resetWelcomeModal() // Borra flag
// O desde otro script:
showWelcomeModal(true) // Fuerza mostrar
```

## Personalización

### Cambiar Texto
Editar en `welcomeModal.js`, función `createModalHTML()`:
```javascript
<h1 class="welcome-modal-title">Tu nuevo título</h1>
```

### Cambiar Imagen
Editar en `welcomeModal.js`:
```javascript
<img 
  src="assets/imagenes/tu-imagen.png" 
  alt="Nuevo alt"
/>
```

### Cambiar Colores
Editar en `participant.css`:
```css
/* Color principal */
color: #f6d06f; /* Cambiar a otro color */

/* Background */
background: linear-gradient(135deg, #f6d06f 0%, #ffe4a6 100%);
```

### Cambiar Delay de Redirección
En `auth.js`, cambiar valor en `setTimeout`:
```javascript
setTimeout(() => {
  location.href = 'participante/dashboard.html';
}, 2000); // 2000ms = 2 segundos
```

### Cambiar Storage Key
En `welcomeModal.js`:
```javascript
this.storageKey = 'welcomeModal_shown_v2'; // Cambiar versión
```

## Responsive Design

| Dispositivo | Ancho Max | Behavior |
|------------|-----------|----------|
| Desktop | 90vw | Centrado con spacing |
| Tablet | 95vw | Reducido padding |
| Mobile | 100vw | Fullscreen con scroll |

## Performance

- ✅ Sin dependencias externas
- ✅ CSS3 animations (hardware accelerated)
- ✅ localStorage para evitar repetición
- ✅ Lazy loading del HTML (se crea al cargar)
- ✅ Event delegation eficiente

## Compatibilidad

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Móviles (iOS/Android)
- ⚠️ IE11: No compatible (usa CSS3 Grid, Flexbox)

## Troubleshooting

### El modal no aparece
1. Verificar que `welcomeModal.js` está cargado
2. Verificar console para errores
3. Resetear localStorage: `resetWelcomeModal()`

### localStorage no funciona
- Aplicación en modo privado: localStorage deshabilitado
- Verifica permisos de origen
- Fallback: El modal sigue mostrándose si localStorage no disponible

### El modal se muestra múltiples veces
- Resetear flag: `resetWelcomeModal()`
- Verificar que hay un único `welcomeModalInstance`

## Testing

### Console Commands
```javascript
// Ver si fue mostrado
localStorage.getItem('welcomeModal_shown_v1')

// Resetear para testing
resetWelcomeModal()

// Forzar mostrar
showWelcomeModal(true)

// Limpiar todo
localStorage.clear()
```

## Analytics (Futuro)

Puedes agregar tracking:
```javascript
showWelcomeModal() {
  // Evento: Modal mostrado
  trackEvent('welcome_modal_shown')
}

close() {
  // Evento: Modal cerrado
  trackEvent('welcome_modal_closed')
}
```

---

**Versión**: 1.0  
**Última actualización**: Febrero 2026  
**Autor**: Sistema Siempre Ganas
