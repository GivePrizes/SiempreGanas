🎰 GUÍA COMPLETA DE DEPLOYMENT - JuegueYGana
Plataforma de Sorteos Online | Microservicios Java | Deployment 100% FREE en Render + Vercel

🚀 DEPLOYMENT PASO A PASO
PARTE 1: PREPARATIVOS (Supabase)
1.1 Crear Proyecto Supabase
Ir a https://supabase.com/

Click "Start your project"

Inicia sesión con GitHub

Crear nuevo proyecto:

Name: juegaygana_prod

Password: [contraseña fuerte, apúntala]

Region: Miami (más cercano a Latinoamérica)

1.2 Copiar Credenciales
En el dashboard de Supabase → Settings → API:

text
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres
SUPABASE_URL = https://[ID].supabase.co
SUPABASE_ANON_KEY = eyJhbGciOi... (copiar completo)
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi... (copiar completo)
1.3 Crear Base de Datos
En Supabase → SQL Editor → Click "New Query":

sql
-- Tabla Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'USER' CHECK (rol IN ('USER', 'ADMIN')),
    habilitado BOOLEAN DEFAULT true,
    token_recuperacion VARCHAR(255),
    expiracion_token TIMESTAMP,
    mensaje_admin TEXT,
    ultima_actualizacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_correo ON usuarios(correo);

-- Tabla Sorteos
CREATE TABLE IF NOT EXISTS sorteo (
    id BIGSERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    fecha_inicial TIMESTAMP NOT NULL,
    fecha_final TIMESTAMP NOT NULL,
    cantidad_numeros INTEGER NOT NULL,
    precio_numero NUMERIC(10, 2) NOT NULL,
    premio VARCHAR(255) NOT NULL,
    fecha_sorteo TIMESTAMP NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_sorteo_activo ON sorteo(activo);

-- Tabla Participaciones
CREATE TABLE IF NOT EXISTS numero_participacion (
    id BIGSERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    sorteo_id BIGINT NOT NULL REFERENCES sorteo(id) ON DELETE CASCADE,
    comprobante_pago VARCHAR(255),
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'SELECCIONADO')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(numero, sorteo_id)
);

CREATE INDEX idx_participacion_usuario ON numero_participacion(usuario_id);
CREATE INDEX idx_participacion_sorteo ON numero_participacion(sorteo_id);
Ejecuta haciendo click en botón ▶️

PARTE 2: BACKEND EN RENDER
2.1 Preparar Código para Render
En el directorio backend/auth-service/:

Verificar pom.xml (ya incluye todas las dependencias)

Verificar Dockerfile:

text
FROM openjdk:17-slim
WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw
RUN ./mvnw dependency:resolve
COPY . .
RUN ./mvnw clean package -DskipTests
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "target/auth-service-1.0.0.jar"]
Verificar application.properties:

text
spring.application.name=auth-service
server.port=8081

# Database
spring.datasource.url=${DATABASE_URL:jdbc:postgresql://localhost:5432/juegueygana_db}
spring.datasource.username=postgres
spring.datasource.password=${DB_PASSWORD:postgres}
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect

# JWT
jwt.secret=${JWT_SECRET:tu_clave_secreta_minimo_32_caracteres}
jwt.expiration.access=${JWT_EXPIRATION_ACCESS_TOKEN:3600000}
jwt.expiration.refresh=${JWT_EXPIRATION_REFRESH_TOKEN:604800000}

# CORS
cors.allowed.origins=${CORS_ALLOWED_ORIGINS:http://localhost:3000}

# Logging
logging.level.root=INFO
2.2 Crear Cuenta Render
Ir a https://render.com

Sign up con GitHub

Autorizar permisos

2.3 Deploy Auth Service
En Render: Click "New +" → "Web Service"

Conectar repositorio GitHub (juegaygana)

Configurar:

Name: auth-service

Environment: Docker

Branch: main

Build Command: (dejar vacío - usa Dockerfile)

Start Command: (dejar vacío)

Environment Variables: Click "Advanced" → Add from .env:

text
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres
DB_PASSWORD=[PASSWORD]
JWT_SECRET=[genera con: openssl rand -base64 32]
JWT_EXPIRATION_ACCESS_TOKEN=3600000
JWT_EXPIRATION_REFRESH_TOKEN=604800000
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://juegaygana.vercel.app
Click "Create Web Service"

Espera 5-10 minutos (primer build es lento)

✅ URL: https://auth-service-xxxxx.onrender.com

2.4 Deploy App Service
Repetir pasos 2.3, pero:

Name: app-service

Build: backend/app-service

Port: 8082

PARTE 3: FRONTEND EN VERCEL
3.1 Actualizar config.js
En frontend/js/config.js:

javascript
export const API_AUTH_URL = 'https://auth-service-xxxxx.onrender.com';
export const API_APP_URL = 'https://app-service-xxxxx.onrender.com';

export const config = {
    apiTimeout: 10000,
    tokenStorageKey: 'jg_token',
    refreshTokenKey: 'jg_refresh_token'
};
3.2 Crear vercel.json
En frontend/vercel.json:

json
{
  "buildCommand": "echo 'Static build'",
  "outputDirectory": ".",
  "installCommand": "echo 'No install needed'",
  "env": {
    "VITE_API_AUTH": "https://auth-service-xxxxx.onrender.com",
    "VITE_API_APP": "https://app-service-xxxxx.onrender.com"
  }
}
3.3 Conectar a Vercel
Ir a https://vercel.com

Sign up con GitHub

Click "Import Project"

Seleccionar repositorio juegaygana

Configurar:

Framework Preset: Other (No framework)

Build Command: (dejar vacío)

Output Directory: . (current)

Environment Variables: Add:

text
VITE_API_AUTH=https://auth-service-xxxxx.onrender.com
VITE_API_APP=https://app-service-xxxxx.onrender.com
Click "Deploy"

✅ URL: https://juegaygana.vercel.app

PARTE 4: TESTING EN PRODUCCIÓN
4.1 Test Auth Service
bash
# Registrar usuario
curl -X POST https://auth-service-xxxxx.onrender.com/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "correo": "test@example.com",
    "telefono": "+573001234567",
    "password": "Test12345!"
  }'

# Login
curl -X POST https://auth-service-xxxxx.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "test@example.com",
    "password": "Test12345!"
  }'
4.2 Test Frontend
Abrir en navegador: https://juegaygana.vercel.app

Verificar que carga sin errores

Click en "Registrarse"

Llenar formulario

Verificar que funciona login

🔐 SEGURIDAD EN PRODUCCIÓN
Checklist de Seguridad
 JWT_SECRET >= 32 caracteres

 CORS solo para dominios autorizados

 HTTPS activado (automático en Vercel + Render)

 Database connection encriptada (Supabase lo hace automático)

 Tokens con expiración corta (1h access, 7d refresh)

 Passwords hasheados con BCrypt

 Rate limiting configurado (TODO en futuro)

 Validación de entrada en frontend + backend

 Logs monitoreados (TODO en futuro)

📊 MONITOREO
Render Dashboard
Ver logs de cada servicio

Restart si hay errores

Monitor de consumo de recursos

Supabase Dashboard
Ver queries ejecutadas

Monitor de storage

Backups automáticos (gratis)

Vercel Dashboard
Ver deployments

Monitor de velocidad

Analytics de visits

🔄 CI/CD CON GITHUB ACTIONS (OPCIONAL)
En .github/workflows/deploy.yml:

text
name: Deploy All Services

on:
  push:
    branches: [ main ]

jobs:
  deploy-auth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Auth Service to Render
        run: |
          curl -X POST https://api.render.com/deploy/srv-[service-id] \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"

  deploy-app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy App Service to Render
        run: |
          curl -X POST https://api.render.com/deploy/srv-[service-id] \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: |
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
💰 COSTOS ESTIMADOS (TODOS FREE)
Servicio	Plan	Costo
Render	Starter (2 web services)	$0/mes
Supabase	Free (PostgreSQL + Storage)	$0/mes
Vercel	Hobby	$0/mes
Dominio	Namecheap (opcional)	$8.95/año
TOTAL		$0 - $1/mes 🎉
🚨 TROUBLESHOOTING
Error: "Database connection refused"
Verificar DATABASE_URL

Verificar credenciales Supabase

Revisar SQL schema

Error: "CORS error"
Actualizar CORS_ALLOWED_ORIGINS

Incluir protocolo (https://)

Sin trailing slash

Error: "Invalid JWT"
Verificar JWT_SECRET es igual en ambos servicios

Verificar formato Bearer token

Revisar expiration times

Frontend no carga
Verificar URLs en config.js

Revisar Console log (F12)

Limpiar cache (Ctrl+Shift+Delete)

📱 POST-DEPLOYMENT
Una vez deployado:

Configurar Admin

Crear usuario admin en DB

Actualizar rol a 'ADMIN'

Crear Primer Sorteo

Login como admin

Ir a admin panel

Crear sorteo de prueba

Test End-to-End

Registrar usuario

Participar en sorteo

Subir comprobante

Admin aprueba

Monitoreo

Revisar logs diariamente

Backup de base de datos (Supabase automático)

Alertas en caso de errores

🎯 PRÓXIMAS MEJORAS
 Integración Stripe/PayPal para pagos reales

 Notificaciones por email

 SMS alertas

 Dashboard admin avanzado

 Analytics y reportes

 Rate limiting

 Cache Redis

 Load testing

 Mobile app (React Native)

 Internacionalización (i18n)

📞 SOPORTE
📧 Email: dev@juegaygana.com

💬 Discord: [link]

🐛 Issues: GitHub

Proyecto 100% funcional y listo para producción ✅

Creado con ❤️ por el equipo JuegueYGana