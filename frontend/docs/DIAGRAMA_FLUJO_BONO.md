# Diagrama Completo del Flujo de Bono

## 📐 Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Siempre Ganas)               │
│                    assets/js/bonus.js                       │
│                  cargarProgresoBono()                       │
└────────────┬────────────────────────────────────────────────┘
             │
             │ GET /api/bonus/progreso
             │ Authorization: Bearer {token}
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (App-Service)                   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1️⃣ MIDDLEWARE: jwtValidate.js                          │ │
│ │    - Verifica formato "Bearer {token}"                 │ │
│ │    - Valida firma JWT                                 │ │
│ │    - Extrae usuario { id, email, rol }               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 2️⃣ ROUTER: bonus.routes.js                             │ │
│ │    - GET /progreso → bonusController.obtenerProgresoBono │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 3️⃣ CONTROLLER: bonusController.js                      │ │
│ │    - obtenerProgresoBono(req, res)                    │ │
│ │    - Extrae usuarioId = req.user.id                  │ │
│ │    - Query a BD: user_bonus_progress                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 4️⃣ DATABASE: user_bonus_progress                        │ │
│ │    - total_aprobados                                  │ │
│ │    - bonus_objetivo                                  │ │
│ │    - bonus_entregado                                 │ │
│ │    - GREATEST(objetivo - aprobados, 0) = faltan     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 5️⃣ RESPONSE (200 OK)                                   │ │
│ │    {                                                  │ │
│ │      "total_aprobados": 5,                          │ │
│ │      "bonus_objetivo": 20,                          │ │
│ │      "bonus_entregado": false,                      │ │
│ │      "faltan": 15                                   │ │
│ │    }                                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Render)                      │
│                    renderBono(data)                         │
│                  - Mostrar barra de progreso                │
│                  - Mostrar porcentaje                       │
│                  - Indicar "faltan X números"              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Ciclo de Vida Completo del Bono

```
┌────────────────────────────────────────────────────────────────┐
│ CICLO 1: USUARIO SUBE COMPROBANTE                              │
└────────────────────────────────────────────────────────────────┘

    PARTICIPANTE
         │
         ▼
    ┌─────────────────────────┐
    │ Elige 1 número          │
    │ Sube comprobante (foto) │
    └────────┬────────────────┘
             │
             │ POST /api/participante/guardar-numeros
             │
             ▼
    ┌─────────────────────────────────────────────┐
    │ Backend: guardarNumeros()                   │
    │ - Valida números (rango y disponibilidad)  │
    │ - Sube foto a Supabase Storage             │
    │ - Inserta en numero_participacion          │
    │   estado = 'pendiente'                     │
    └────────┬────────────────────────────────────┘
             │
             ▼
    TABLA: numero_participacion
    ┌──────────────────────────────┐
    │ id: 1234                     │
    │ usuario_id: 42               │
    │ sorteo_id: 5                 │
    │ numero: 7                    │
    │ estado: 'pendiente' ◄────┐   │
    │ comprobante_url: [...]   │   │
    │ fecha: NOW()             │   │
    └──────────────────────────┼───┘
                               │
                          ESPERANDO
                          APROBACIÓN
                          DEL ADMIN

─────────────────────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────┐
│ CICLO 2: ADMIN APRUEBA COMPROBANTE                             │
└────────────────────────────────────────────────────────────────┘

    ADMIN (Dashboard)
         │
         ▼
    ┌──────────────────────────┐
    │ Ve comprobante pendiente │
    │ Valida foto              │
    │ Click en "Aprobar"       │
    └────────┬─────────────────┘
             │
             │ POST /api/admin/aprobar/:id
             │ id = 1234
             │
             ▼
    ┌──────────────────────────────────────────────────────┐
    │ Backend: aprobarComprobante(id=1234)                 │
    │ BEGIN TRANSACTION                                    │
    └────────┬─────────────────────────────────────────────┘
             │
             │ PASO 1️⃣: Obtener usuario_id y sorteo_id
             ▼
    ┌──────────────────────────────────────────┐
    │ usuario_id = 42                          │
    │ sorteo_id = 5                            │
    │ [Bloquear fila con FOR UPDATE]           │
    └────────┬─────────────────────────────────┘
             │
             │ PASO 2️⃣: Marcar número como aprobado
             ▼
    ┌──────────────────────────────────┐
    │ UPDATE numero_participacion      │
    │ SET estado = 'aprobado'          │
    │ WHERE id = 1234                  │
    └────────┬─────────────────────────┘
             │
             │ PASO 3️⃣: 🔥 INCREMENTAR BONO GLOBAL
             ▼
    ┌──────────────────────────────────────────────────────┐
    │ INSERT INTO user_bonus_progress                      │
    │   (usuario_id, total_aprobados)                      │
    │ VALUES (42, 1)                                       │
    │ ON CONFLICT (usuario_id) DO UPDATE                  │
    │   SET total_aprobados = total_aprobados + 1        │
    │                                                      │
    │ Resultado: usuario 42 tiene 5 → 6 números aprobados│
    └────────┬─────────────────────────────────────────────┘
             │
             │ PASO 4️⃣: Crear entrega de cuenta (por sorteo)
             ▼
    ┌──────────────────────────────────────────┐
    │ INSERT INTO entrega_cuenta                │
    │   (sorteo_id, usuario_id, estado)        │
    │ VALUES (5, 42, 'pendiente')              │
    │ ON CONFLICT DO NOTHING                   │
    └────────┬─────────────────────────────────┘
             │
             │ PASO 5️⃣: Verificar si completó objetivo
             ▼
    ┌──────────────────────────────────────────────┐
    │ SELECT total_aprobados, bonus_objetivo,      │
    │        bonus_entregado                       │
    │ FROM user_bonus_progress                     │
    │ WHERE usuario_id = 42                        │
    │                                              │
    │ Resultado: 6 aprobados, objetivo = 20      │
    │ 6 < 20 → No completó aún                   │
    └────────┬─────────────────────────────────────┘
             │
             │ NO → No hacer nada
             ▼
    ┌──────────────────────────────────────────┐
    │ COMMIT TRANSACTION ✅                     │
    │                                          │
    │ Respuesta al Admin:                      │
    │ {                                        │
    │   "success": true,                       │
    │   "bono": {                              │
    │     "total_aprobados": 6,               │
    │     "bonus_entregado": false            │
    │   }                                      │
    │ }                                        │
    └────────┬─────────────────────────────────┘
             │
             ▼
    TABLA: user_bonus_progress
    ┌──────────────────────────────┐
    │ usuario_id: 42               │
    │ total_aprobados: 6 ◄──────┐  │ ACTUALIZADO
    │ bonus_objetivo: 20           │
    │ bonus_entregado: false       │
    │ faltan: 14                   │
    └──────────────────────────────┘

─────────────────────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────┐
│ CICLO 3: USUARIO CONSULTA SU PROGRESO                          │
└────────────────────────────────────────────────────────────────┘

    USUARIO (Dashboard)
         │
         ▼
    ┌────────────────────────────┐
    │ Página se carga            │
    │ Ejecuta cargarProgresoBono()│
    └────────┬───────────────────┘
             │
             │ GET /api/bonus/progreso
             │ Authorization: Bearer {token}
             │
             ▼
    ┌─────────────────────────────────┐
    │ Middleware: verifyToken          │
    │ - Valida Bearer format           │
    │ - Valida firma JWT               │
    │ - Extrae usuario_id = 42        │
    └────────┬────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ Controller: obtenerProgresoBono(usuario_id=42)
    │                                              │
    │ SELECT                                       │
    │   total_aprobados,                          │
    │   bonus_objetivo,                           │
    │   bonus_entregado,                          │
    │   GREATEST(bonus_objetivo - total_aprobados,
    │            0) AS faltan                     │
    │ FROM user_bonus_progress                    │
    │ WHERE usuario_id = 42                       │
    └────────┬─────────────────────────────────────┘
             │
             ▼
    TABLA: user_bonus_progress
    ┌──────────────────────────────┐
    │ usuario_id: 42               │
    │ total_aprobados: 6 ─────┐    │
    │ bonus_objetivo: 20 ──┐  │    │
    │ bonus_entregado: f. │  │    │
    │ (calculado):        │  │    │
    │ faltan = GREATEST   │  │    │
    │   (20 - 6, 0)       │  │    │
    │ faltan = 14 ←───────┘  │    │
    └────────┬───────────────┼────┘
             │               │
             │ RESPONSE:     │
             ▼               │
    ┌────────────────────────────────┐
    │ Status: 200 OK                 │
    │ {                              │
    │   "total_aprobados": 6,       │◄─┘
    │   "bonus_objetivo": 20,       │
    │   "bonus_entregado": false,   │
    │   "faltan": 14                │
    │ }                              │
    └────────┬───────────────────────┘
             │
             ▼
    FRONTEND RENDER
    ┌────────────────────────────────────────────────┐
    │                 Tu Bono de Fidelidad          │
    │                                               │
    │  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
    │        6 / 20 números                        │
    │                                               │
    │  Faltan 14 números para desbloquear bonificación
    │                                               │
    │  [Progreso: 30%]                             │
    └────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────┐
│ CICLO FINAL: USUARIO COMPLETA OBJETIVO (20 números)            │
└────────────────────────────────────────────────────────────────┘

    [Después de 14 aprobaciones más...]
    
    ADMIN aprueba número #20
         │
         ▼
    ┌──────────────────────────────────────────────┐
    │ Backend: aprobarComprobante(id=XXXX)         │
    │ [Pasos 1-4 igual...]                         │
    │                                              │
    │ PASO 5️⃣ REVISADO: ¿total_aprobados >= 20?  │
    └────────┬─────────────────────────────────────┘
             │
             │ SÍ → Completó objetivo
             ▼
    ┌──────────────────────────────────────────────┐
    │ UPDATE user_bonus_progress                   │
    │ SET bonus_entregado = true                   │
    │ WHERE usuario_id = 42                        │
    │                                              │
    │ INSERT INTO entrega_cuenta                   │
    │ (sorteo_id, usuario_id, estado)              │
    │ VALUES (NULL, 42, 'pendiente')               │
    │ -- Entrega GRATIS sin sorteo específico --   │
    └────────┬─────────────────────────────────────┘
             │
             ▼
    USUARIO VE EN SU DASHBOARD
    ┌────────────────────────────────────────────────┐
    │                 Tu Bono de Fidelidad          │
    │                                               │
    │  ████████████████████████████████████████████ │
    │        20 / 20 números ✅ COMPLETADO         │
    │                                               │
    │  🎁 ¡FELICIDADES! Desbloqueaste tu bonus     │
    │                                               │
    │  Tu entrega está en proceso...                │
    └────────────────────────────────────────────────┘
```

---

## 🗃️ Tablas Relacionadas

```
┌─────────────────────────────────────────────────────────────┐
│                      usuarios                               │
├─────────────────────────────────────────────────────────────┤
│ PK  id          INT                                         │
│     nombre      VARCHAR                                    │
│     email       VARCHAR                                    │
│     telefono    VARCHAR                                    │
│     contraseña  VARCHAR (hash)                             │
│     rol         VARCHAR (usuario, admin)                   │
└────────┬────────────────────────────────────────────────────┘
         │
         │ (1:1)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│               user_bonus_progress                           │
├─────────────────────────────────────────────────────────────┤
│ PK  usuario_id          INT (FK usuarios.id)               │
│     total_aprobados     INT DEFAULT 0                      │
│     bonus_objetivo      INT DEFAULT 20                     │
│     bonus_entregado     BOOLEAN DEFAULT false              │
│     -- CALCULADO: faltan = MAX(objetivo - aprobados, 0)   │
└──────┬─────────────────────────────────────────────────────┘
       │
       │ Actualizado por ↓
       │
       └────────────────────────┐
                                │
         ┌──────────────────────┘
         │
         │ (1:N)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│               numero_participacion                          │
├─────────────────────────────────────────────────────────────┤
│ PK  id              INT                                     │
│ FK  usuario_id      INT (usuarios.id)                      │
│ FK  sorteo_id       INT (sorteo.id)                        │
│     numero          INT (1-N según cantidad_numeros)      │
│     estado          VARCHAR (pendiente, aprobado,          │
│                              rechazado)                    │
│     comprobante_url VARCHAR (URL en Supabase)             │
│     fecha           TIMESTAMP                              │
│     UNIQUE (sorteo_id, numero) ← Un número por sorteo     │
└──────┬─────────────────────────────────────────────────────┘
       │
       │ (1:N)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                  entrega_cuenta                             │
├─────────────────────────────────────────────────────────────┤
│ FK  sorteo_id       INT (sorteo.id) NULLABLE               │
│ FK  usuario_id      INT (usuarios.id)                      │
│     estado          VARCHAR (pendiente, entregada)         │
│     entregada_at    TIMESTAMP                              │
│     entregada_por   INT (usuario admin que entregó)       │
│                                                            │
│ Notas:                                                     │
│ - sorteo_id = NULL → Entrega GRATIS (por bono completado)│
│ - UNIQUE (sorteo_id, usuario_id)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo de Seguridad

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TOKEN GENERACIÓN (en auth-service)                       │
└─────────────────────────────────────────────────────────────┘

    Usuario login con email + contraseña
             │
             ▼
    Validar en BD
             │
             ▼
    JWT.sign({
      id: 42,
      email: 'usuario@email.com',
      rol: 'usuario'
    }, JWT_SECRET)
             │
             ▼
    <JWT_DEMO_TOKEN>
    
    Almacenado en localStorage del cliente

─────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│ 2. ENVÍO DEL REQUEST (en frontend)                          │
└─────────────────────────────────────────────────────────────┘

    fetch('/api/bonus/progreso', {
      headers: {
        Authorization: 'Bearer <JWT_DEMO_TOKEN>' ◄── Token aquí
      }
    })

─────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDACIÓN EN MIDDLEWARE (verifyToken)                   │
└─────────────────────────────────────────────────────────────┘

    const authHeader = 'Bearer <JWT_DEMO_TOKEN>'
                        │
                        ├─ ¿Empieza con 'Bearer '? ✓
                        │
                        ▼
    const token = '<JWT_DEMO_TOKEN>'
                        │
                        ▼
    jwt.verify(token, JWT_SECRET)
                        │
                        ├─ ¿Firma válida? ✓
                        ├─ ¿No expirado? ✓
                        │
                        ▼
    payload = {
      id: 42,           ◄── Extraído
      email: '...',
      rol: 'usuario'
    }
                        │
                        ▼
    req.user = payload  ◄── Disponible en controller
                        │
                        ▼
    next()  ✅ Autorizado

─────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│ 4. FILTRADO EN QUERY (seguridad de datos)                   │
└─────────────────────────────────────────────────────────────┘

    const usuarioId = req.user.id  // 42
                        │
                        ▼
    SELECT * FROM user_bonus_progress
    WHERE usuario_id = $1  ◄── Solo datos del usuario 42
    
    ✅ Imposible ver datos de otros usuarios

─────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│ 5. POSIBLES ERRORES Y RESPUESTAS                            │
└─────────────────────────────────────────────────────────────┘

    No envía token
             │
             ▼
    req.headers.authorization = undefined
             │
             ▼
    401 { error: 'Token requerido' }

    ─────────────────────────────────────────────

    Token inválido
             │
             ▼
    jwt.verify() lanza error
             │
             ▼
    403 { error: 'Token inválido o expirado' }

    ─────────────────────────────────────────────

    Token válido pero sin registro en bono
             │
             ▼
    result.rows.length === 0
             │
             ▼
    200 {
      total_aprobados: 0,
      bonus_objetivo: 20,
      faltan: 20,
      bonus_entregado: false
    }
```

---

## 📋 Resumen de Transacciones

```
┌──────────────────────────────────────────────────────┐
│ TRANSACTION: Aprobar Comprobante (CRITICAL)          │
└──────────────────────────────────────────────────────┘

BEGIN;

  ① SELECT sorteo_id, usuario_id
     FROM numero_participacion
     WHERE id = $1 AND estado = 'pendiente'
     FOR UPDATE;
     -- Bloquea fila para evitar doble aprobación

  ② UPDATE numero_participacion
     SET estado = 'aprobado'
     WHERE id = $1;

  ③ INSERT INTO user_bonus_progress (usuario_id, total_aprobados)
     VALUES ($1, 1)
     ON CONFLICT (usuario_id)
     DO UPDATE SET total_aprobados = total_aprobados + 1;

  ④ INSERT INTO entrega_cuenta (sorteo_id, usuario_id, estado)
     VALUES ($1, $2, 'pendiente')
     ON CONFLICT (sorteo_id, usuario_id) DO NOTHING;

  ⑤ SELECT total_aprobados, bonus_objetivo, bonus_entregado
     FROM user_bonus_progress
     WHERE usuario_id = $1;

  ⑥ IF total_aprobados >= bonus_objetivo AND NOT bonus_entregado
     THEN
       UPDATE user_bonus_progress
       SET bonus_entregado = true
       WHERE usuario_id = $1;
       
       INSERT INTO entrega_cuenta (sorteo_id, usuario_id, estado)
       VALUES (NULL, $1, 'pendiente')
       ON CONFLICT DO NOTHING;
     END IF;

COMMIT;

✅ Transacción ATOMIC: todo éxito o todo rollback
```

---

**Diagrama actualizado:** 26 de enero de 2026  
**Validado contra código:** https://github.com/GivePrizes/app-service

