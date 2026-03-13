# Referencia Rápida - Código del Backend de Bono

## 📍 Ubicaciones Exactas en el Repo

```
app-service/
├── api/
│   ├── routes/
│   │   └── bonus.routes.js          ← Definición de endpoint
│   ├── controllers/
│   │   ├── bonusController.js       ← Obtener progreso
│   │   └── adminController.js       ← Aprobar (actualiza bono)
│   └── middleware/
│       └── jwtValidate.js           ← Autenticación
└── index.js                         ← Registra rutas
```

---

## 🔗 Endpoint Completo

### URL
```
GET /api/bonus/progreso
Host: app-service-phi.vercel.app (o localhost en desarrollo)
```

### Headers Requeridos
```
Authorization: Bearer <JWT_DEMO_TOKEN>
Content-Type: application/json (implícito)
```

### Request (desde fetch del frontend)
```javascript
const res = await fetch(`${window.API_URL}/api/bonus/progreso`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await res.json();
```

### Response Exitosa (200 OK)
```json
{
  "total_aprobados": 5,
  "bonus_objetivo": 20,
  "bonus_entregado": false,
  "faltan": 15
}
```

O si el usuario no tiene registro:
```json
{
  "total_aprobados": 0,
  "bonus_objetivo": 20,
  "faltan": 20,
  "bonus_entregado": false
}
```

### Response Errores

**Sin token (401)**
```json
{
  "error": "Token requerido"
}
```

**Token inválido (403)**
```json
{
  "error": "Token inválido o expirado"
}
```

**Error en base de datos (500)**
```json
{
  "error": "Error obteniendo progreso del bono"
}
```

---

## 🔐 Flujo de Autenticación

### 1. Token en Header
```javascript
// En frontend (assets/js/bonus.js)
const token = localStorage.getItem('token');
headers: { Authorization: `Bearer ${token}` }
```

### 2. Validación en Middleware
```javascript
// api/middleware/jwtValidate.js
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // 1️⃣ Verificar formato "Bearer {token}"
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // 2️⃣ Verificar firma y expiración
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3️⃣ Extraer datos: { id, email, rol }
    req.user = payload;
    next(); // ✅ Autorizado
    
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};
```

### 3. Obtención de Datos
```javascript
// api/controllers/bonusController.js
export const obtenerProgresoBono = async (req, res) => {
  // req.user contiene { id, email, rol } del JWT
  const usuarioId = req.user.id;  // ← Usuario autenticado
  
  // Query filtra por usuario
  const result = await pool.query(`
    SELECT total_aprobados, bonus_objetivo, bonus_entregado,
           GREATEST(bonus_objetivo - total_aprobados, 0) AS faltan
    FROM user_bonus_progress
    WHERE usuario_id = $1
  `, [usuarioId]);  // ← Solo datos de ese usuario
  
  return res.json(result.rows[0] || defaults);
};
```

---

## 📊 Actualización del Bono

### ¿Cuándo se incrementa `total_aprobados`?

En `api/controllers/adminController.js` función `aprobarComprobante()`:

```javascript
export const aprobarComprobante = async (req, res) => {
  const { id } = req.params;  // ID del número a aprobar

  try {
    await pool.query('BEGIN');  // Iniciar transacción

    // 1️⃣ Obtener usuario_id y sorteo_id del número
    const pendienteRes = await pool.query(`
      SELECT sorteo_id, usuario_id
      FROM numero_participacion
      WHERE id = $1 AND estado = 'pendiente'
      FOR UPDATE
    `, [id]);

    const { sorteo_id: sorteoId, usuario_id: usuarioId } = pendienteRes.rows[0];

    // 2️⃣ APROBAR EL NÚMERO
    await pool.query(`
      UPDATE numero_participacion
      SET estado = 'aprobado'
      WHERE id = $1
    `, [id]);

    // 3️⃣ 🔥 INCREMENTAR BONO GLOBAL
    await pool.query(`
      INSERT INTO user_bonus_progress (usuario_id, total_aprobados)
      VALUES ($1, 1)
      ON CONFLICT (usuario_id)
      DO UPDATE
      SET total_aprobados = user_bonus_progress.total_aprobados + 1
    `, [usuarioId]);

    // 4️⃣ Verificar si completó el objetivo
    const bonusRes = await pool.query(`
      SELECT total_aprobados, bonus_objetivo, bonus_entregado
      FROM user_bonus_progress
      WHERE usuario_id = $1
    `, [usuarioId]);

    const bonus = bonusRes.rows[0];

    // 5️⃣ Si alcanzó el objetivo → Entrega automática
    if (bonus && 
        bonus.total_aprobados >= bonus.bonus_objetivo &&
        bonus.bonus_entregado === false) {
      
      // Marcar como entregado
      await pool.query(`
        UPDATE user_bonus_progress
        SET bonus_entregado = true
        WHERE usuario_id = $1
      `, [usuarioId]);

      // Crear entrega GRATIS (sin sorteo específico)
      await pool.query(`
        INSERT INTO entrega_cuenta (sorteo_id, usuario_id, estado)
        VALUES (NULL, $1, 'pendiente')
        ON CONFLICT DO NOTHING
      `, [usuarioId]);
    }

    await pool.query('COMMIT');  // Confirmar transacción
    
    return res.json({
      success: true,
      bono: {
        total_aprobados: bonus?.total_aprobados ?? null,
        bonus_entregado: bonus?.bonus_entregado ?? false
      }
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
};
```

**Clave:** Usa `ON CONFLICT` de PostgreSQL para hacer upsert seguro.

---

## 🧮 Cálculo de "faltan"

### En SQL
```sql
GREATEST(bonus_objetivo - total_aprobados, 0) AS faltan
```

**Función:** Devuelve el valor mayor entre dos números
- Si `total_aprobados = 5` y `bonus_objetivo = 20` → `faltan = 15`
- Si `total_aprobados = 25` y `bonus_objetivo = 20` → `faltan = 0` (nunca negativo)

### Alternativa (si no existiera `GREATEST`)
```sql
CASE 
  WHEN bonus_objetivo - total_aprobados < 0 THEN 0
  ELSE bonus_objetivo - total_aprobados
END AS faltan
```

---

## 🔄 Registración en App Principal

### En `index.js`
```javascript
// Importar rutas de bonus
import bonusRoutes from './api/routes/bonus.routes.js';

// ... otras importaciones y middleware ...

// Registrar rutas
app.use('/api/bonus', bonusRoutes);  // ← Aquí se monta en /api/bonus
```

**Resultado:** GET request a `/api/bonus/progreso` llega a `bonusController.obtenerProgresoBono()`

---

## 🚨 Manejo de Errores

### En Controlador
```javascript
try {
  const result = await pool.query(/* ... */);
  
  if (result.rows.length === 0) {
    // Usuario sin registro → valores por defecto
    return res.json({
      total_aprobados: 0,
      bonus_objetivo: 20,
      faltan: 20,
      bonus_entregado: false
    });
  }

  return res.json(result.rows[0]);  // ✅ Datos encontrados
  
} catch (err) {
  // ❌ Error en BD
  console.error('Error en obtenerProgresoBono:', err);
  return res.status(500).json({
    error: 'Error obteniendo progreso del bono'
  });
}
```

---

## 📝 Estructura de Base de Datos

### Tabla `user_bonus_progress`
```sql
CREATE TABLE user_bonus_progress (
  usuario_id INTEGER PRIMARY KEY,
  total_aprobados INTEGER DEFAULT 0,
  bonus_objetivo INTEGER DEFAULT 20,
  bonus_entregado BOOLEAN DEFAULT false,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

### Tabla `numero_participacion` (relacionada)
```sql
CREATE TABLE numero_participacion (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  sorteo_id INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',  -- pendiente, aprobado, rechazado
  comprobante_url TEXT,
  fecha TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (sorteo_id) REFERENCES sorteo(id),
  UNIQUE (sorteo_id, numero)
);
```

---

## 💡 Notas Importantes

1. **El bono es GLOBAL por usuario**, no por sorteo
2. **No hay restricción temporal** - acumula desde cualquier fecha
3. **Actualización automática** - no requiere llamada manual desde frontend
4. **Entrega automática** - cuando `total_aprobados >= bonus_objetivo`
5. **Sin validación de rol** - cualquier usuario autenticado puede leer su progreso
6. **Transacciones seguras** - usar `BEGIN/COMMIT/ROLLBACK` para atomicidad

---

## 🔗 URLs Útiles

- **Repositorio:** https://github.com/GivePrizes/app-service
- **Despliegue:** https://app-service-phi.vercel.app
- **Rama:** main
- **Último commit:** a506ed9 (hace 1 día)

---

## ✅ Testing Manual

### Con curl
```bash
# 1. Obtener token (requiere auth-service)
TOKEN="<JWT_DEMO_TOKEN>"

# 2. Llamar al endpoint
curl -X GET \
  'http://app-service-phi.vercel.app/api/bonus/progreso' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Respuesta esperada
# {"total_aprobados":5,"bonus_objetivo":20,"bonus_entregado":false,"faltan":15}
```

### Con JavaScript (Node.js)
```javascript
const token = '<JWT_DEMO_TOKEN>';

const res = await fetch('http://localhost:3001/api/bonus/progreso', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await res.json();
console.log(data);
// { total_aprobados: 5, bonus_objetivo: 20, bonus_entregado: false, faltan: 15 }
```

---

**Generado:** 26 de enero de 2026  
**Verificado:** Repositorio GitHub GivePrizes/app-service (main)

