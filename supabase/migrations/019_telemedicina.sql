-- Migration: 019_telemedicina.sql
-- M11 Telemedicina (Fase A): turnos virtuales + pago QR + Jitsi.
--
-- Decisiones (ver docs/decisiones.md sección 2026-04-21):
-- - Jitsi meet.jit.si hosted con lobby + password
-- - Pago previo, QR + comprobante manual (admin verifica)
-- - Primera consulta virtual con pago obligatorio + seguimiento virtual con costo menor
-- - Precio configurable por odontólogo (tabla precios_telemedicina)
-- - File share nativo de Jitsi (no se persiste en historial)

-- ── 1. Extender turnos para soportar modalidad virtual ──────────────────────
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS modalidad TEXT NOT NULL DEFAULT 'presencial'
    CHECK (modalidad IN ('presencial', 'virtual')),
  ADD COLUMN IF NOT EXISTS es_primera_consulta BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS precio DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'no_aplica'
    CHECK (estado_pago IN ('no_aplica', 'pendiente', 'comprobante_subido', 'verificado', 'rechazado')),
  ADD COLUMN IF NOT EXISTS comprobante_url TEXT,
  ADD COLUMN IF NOT EXISTS jitsi_room TEXT,
  ADD COLUMN IF NOT EXISTS jitsi_password TEXT,
  ADD COLUMN IF NOT EXISTS fecha_pago_verificado TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_turnos_modalidad ON turnos(modalidad);
CREATE INDEX IF NOT EXISTS idx_turnos_estado_pago ON turnos(estado_pago)
  WHERE estado_pago IN ('comprobante_subido', 'pendiente');

COMMENT ON COLUMN turnos.modalidad IS 'M11: presencial o virtual (telemedicina)';
COMMENT ON COLUMN turnos.es_primera_consulta IS 'M11: true para primera virtual (precio mayor)';
COMMENT ON COLUMN turnos.estado_pago IS 'M11: pago previo a turno virtual';
COMMENT ON COLUMN turnos.jitsi_room IS 'M11: nombre único de sala meet.jit.si (UUID hash)';
COMMENT ON COLUMN turnos.jitsi_password IS 'M11: password de la sala (generado al verificar pago)';


-- ── 2. precios_telemedicina (por odontólogo) ────────────────────────────────
CREATE TABLE IF NOT EXISTS precios_telemedicina (
  id SERIAL PRIMARY KEY,
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,
  odontologo_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  precio_primera_consulta DECIMAL(10, 2) NOT NULL,
  precio_seguimiento DECIMAL(10, 2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'ARS',
  qr_pago_url TEXT,                                    -- URL imagen QR (Mercado Pago, transferencia, etc.)
  datos_transferencia TEXT,                            -- CBU/Alias/instrucciones
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (consultorio_id, odontologo_id)
);

CREATE INDEX IF NOT EXISTS idx_precios_consultorio_activo
  ON precios_telemedicina(consultorio_id, activo);

ALTER TABLE precios_telemedicina DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_precios_telemedicina_updated_at
  BEFORE UPDATE ON precios_telemedicina
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 3. recetas (Fase B implementará UI; tabla la dejamos lista) ─────────────
CREATE TABLE IF NOT EXISTS recetas (
  id SERIAL PRIMARY KEY,
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,
  turno_id INTEGER REFERENCES turnos(id) ON DELETE SET NULL,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  odontologo_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,                             -- texto libre (medicación, indicaciones)
  pdf_url TEXT,                                         -- generado al crear
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recetas_paciente ON recetas(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recetas_consultorio ON recetas(consultorio_id, created_at DESC);

ALTER TABLE recetas DISABLE ROW LEVEL SECURITY;


-- ── 4. chat_paciente_odontologo (Fase B implementará UI) ────────────────────
CREATE TABLE IF NOT EXISTS chat_paciente_odontologo (
  id BIGSERIAL PRIMARY KEY,
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  odontologo_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  autor TEXT NOT NULL CHECK (autor IN ('paciente', 'odontologo')),
  mensaje TEXT NOT NULL,
  archivo_url TEXT,
  leido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_paciente_odontologo
  ON chat_paciente_odontologo(paciente_id, odontologo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_no_leido
  ON chat_paciente_odontologo(odontologo_id, leido, created_at DESC) WHERE leido = FALSE;

ALTER TABLE chat_paciente_odontologo DISABLE ROW LEVEL SECURITY;


-- ── 5. Bucket comprobantes ──────────────────────────────────────────────────
-- IMPORTANTE: crear manualmente en Supabase Dashboard → Storage:
--   Nombre: comprobantes
--   Privado (NO public bucket) — usaremos signed URLs
