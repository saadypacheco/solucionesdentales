-- Migration: 011_usuarios_activo.sql
-- Agregar campos activo y especialidades a la tabla usuarios

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS especialidades TEXT[] DEFAULT '{}';

-- Index para búsquedas por activo (staff listing)
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
