-- Migration: 018_notificaciones.sql
-- M12: tabla central de notificaciones in-app.
--
-- Tipos soportados (extensible):
-- - nuevo_turno              → admin/recepcionista
-- - turno_cancelado          → admin/recepcionista (cuando paciente cancela)
-- - turno_recordatorio_24h   → paciente (cron diario)
-- - paciente_llego_recepcion → odontólogo asignado
-- - paciente_llego_lobby     → odontólogo (telemedicina M11)
-- - nuevo_chat               → contraparte (M11 chat async)
-- - pago_verificado          → paciente (telemedicina M11)
-- - comprobante_recibido     → admin (telemedicina M11)
-- - receta_disponible        → paciente (M11)
-- - documento_aprobado       → admin del consultorio
-- - documento_rechazado      → admin del consultorio
-- - alarma_critica           → admin (escalamiento de seguimiento)
--
-- destinatario: una sola notif puede ir a usuario_id (staff) O paciente_id (paciente).
-- Nunca ambos al mismo tiempo.

CREATE TABLE notificaciones (
  id BIGSERIAL PRIMARY KEY,
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,

  -- Destinatario (uno y solo uno)
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,

  -- Contenido
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT,
  link TEXT,                                 -- URL destino al hacer click
  metadata JSONB,                            -- datos extra (turno_id, etc)

  -- Estado
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  leida_at TIMESTAMP WITH TIME ZONE,
  prioridad TEXT NOT NULL DEFAULT 'normal'
    CHECK (prioridad IN ('baja', 'normal', 'alta', 'critica')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantizar que solo uno de usuario_id/paciente_id está seteado
  CONSTRAINT notif_destinatario_xor CHECK (
    (usuario_id IS NOT NULL AND paciente_id IS NULL) OR
    (usuario_id IS NULL AND paciente_id IS NOT NULL)
  )
);

-- Índices para queries frecuentes
CREATE INDEX idx_notif_usuario_no_leida ON notificaciones(usuario_id, created_at DESC)
  WHERE leida = FALSE AND usuario_id IS NOT NULL;
CREATE INDEX idx_notif_paciente_no_leida ON notificaciones(paciente_id, created_at DESC)
  WHERE leida = FALSE AND paciente_id IS NOT NULL;
CREATE INDEX idx_notif_consultorio ON notificaciones(consultorio_id, created_at DESC);

-- RLS desactivado (mismo criterio que tablas compliance — backend filtra)
ALTER TABLE notificaciones DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE notificaciones IS 'M12: notificaciones in-app para staff y pacientes';
COMMENT ON COLUMN notificaciones.tipo IS 'Categoría discreta para filtrar/iconizar en UI';
COMMENT ON COLUMN notificaciones.metadata IS 'Datos contextuales (ej: {"turno_id": 42})';
