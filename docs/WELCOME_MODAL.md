Quiero que ajustes el sistema de welcomeModal siguiendo exactamente estas directrices técnicas y legales.

1️⃣ Limpieza y Refactorización

Eliminar completamente:

Imagen anterior del modal.

Código HTML no utilizado.

Clases CSS que ya no se usen.

Variables JS obsoletas.

No dejar código muerto ni comentarios innecesarios.

Mantener el archivo documentado y estructurado.

Mantener naming consistente con el proyecto.

2️⃣ Nueva Imagen

Usar esta imagen:

assets/imagenes/disn+Netflix.png


Requisitos:

Responsive real.

Debe verse perfectamente en móvil (max-width 100%).

Mantener proporción.

No deformar.

Usar object-fit: contain.

Debe cargar lazy si es posible.

Agregar alt descriptivo neutral (sin uso de marcas como promesa comercial).

Ejemplo alt sugerido:

Promoción especial disponible para participantes

3️⃣ Mostrar SOLO a Participantes

El modal debe mostrarse únicamente si:

user.role === 'participante'


No debe mostrarse a admin ni otros roles.

4️⃣ Botón CTA

Cambiar el botón actual por uno que diga:

QUIERO MI CUPO AHORA


Debe:

Mantener el mismo estilo visual premium.

Tener hover effect.

Tener transición suave.

Redirigir a:

https://siempre-ganas.vercel.app/participante/sorteo.html?id=42


Importante:
No usar window.open.
Usar location.href.

5️⃣ Tiempo y Flujo

Mantener el delay actual (2 segundos).

No bloquear navegación.

No generar doble redirección.

No interferir con auth.

6️⃣ Responsividad Obligatoria

Debe verse perfecto en:

360px (móvil pequeño)

390px

768px

Desktop

En móvil:

Modal casi fullscreen.

Scroll interno si es necesario.

Padding optimizado.

Texto legible sin overflow.

No permitir:

Desbordamientos.

Texto cortado.

Botones fuera de pantalla.

7️⃣ Ajuste Legal (Cumplimiento Coljuegos)

⚠️ Muy importante:

Eliminar cualquier frase como:

“Premios garantizados”

“Gana seguro”

“100% garantizado”

Usar lenguaje adecuado:

“Participa en sorteos disponibles”

“Promoción válida hasta agotar cupos”

“Aplican términos y condiciones”

Agregar una línea pequeña debajo del CTA:

Promoción sujeta a términos y condiciones.


Sin exageraciones comerciales.

8️⃣ Código Bien Documentado

En el archivo:

Comentar secciones principales.

Explicar:

Control de rol

Control de localStorage

Control de redirección

Versionado del storageKey

Ejemplo:

// Solo mostrar a participantes autenticados
if (user?.role !== 'participante') return;

9️⃣ Storage Profesional

Actualizar storageKey a:

welcomeModal_participante_v2


Y que sea versionado para evitar conflictos.

🔟 No Romper Arquitectura

No modificar auth global.

No modificar rutas existentes.

No duplicar listeners.

No generar memory leaks.