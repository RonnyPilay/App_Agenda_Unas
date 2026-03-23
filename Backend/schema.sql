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
