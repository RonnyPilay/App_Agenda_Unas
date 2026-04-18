-- Ejecuta este script en tu base de datos de Neon antes de iniciar el backend.
-- Crea la tabla principal de turnos y algunos índices útiles para filtros por fecha.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  nombre TEXT NOT NULL,
  valor NUMERIC(12, 2) DEFAULT 0,
  ganancia NUMERIC(12, 2) DEFAULT 0,
  detalles TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos (fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_nombre ON turnos (lower(nombre));

CREATE TABLE IF NOT EXISTS anotaciones_dia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pago', 'feriado', 'otros')),
  titulo TEXT,
  descripcion TEXT,
  total_cobrado NUMERIC(12, 2),
  adelantos NUMERIC(12, 2),
  propinas NUMERIC(12, 2),
  total_neto NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anotaciones_dia_fecha ON anotaciones_dia (fecha);
CREATE INDEX IF NOT EXISTS idx_anotaciones_dia_tipo ON anotaciones_dia (tipo);
