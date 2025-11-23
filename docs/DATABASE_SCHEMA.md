-- TABLA 1: USUARIOS
CREATE TABLE public.usuarios (
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
  ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_correo ON public.usuarios(correo);

-- TABLA 2: SORTEO
CREATE TABLE public.sorteo (
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sorteo_activo ON public.sorteo(activo);
CREATE INDEX idx_sorteo_fecha ON public.sorteo(fecha_sorteo);

-- TABLA 3: NUMERO_PARTICIPACION
CREATE TABLE public.numero_participacion (
  id BIGSERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  sorteo_id BIGINT NOT NULL REFERENCES public.sorteo(id) ON DELETE CASCADE,
  comprobante_pago VARCHAR(255),
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'SELECCIONADO')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_participacion_usuario ON public.numero_participacion(usuario_id);
CREATE INDEX idx_participacion_sorteo ON public.numero_participacion(sorteo_id);
CREATE INDEX idx_participacion_estado ON public.numero_participacion(estado);
CREATE UNIQUE INDEX idx_participacion_numero_sorteo ON public.numero_participacion(numero, sorteo_id);
