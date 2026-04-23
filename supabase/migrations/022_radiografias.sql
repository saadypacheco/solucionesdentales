-- Migration: 022_radiografias.sql
-- Radiografías y otras imágenes médicas asociadas al historial clínico.
-- Separado de historial_clinico (que es 1:1) porque un paciente puede tener N radiografías.
--
-- Bucket Supabase Storage requerido (crear manualmente): 'radiografias' (privado).
-- Backend sirve URLs firmadas al paciente/staff.

CREATE TABLE IF NOT EXISTS radiografias (
  id              SERIAL PRIMARY KEY,
  paciente_id     INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consultorio_id  INTEGER NOT NULL REFERENCES consultorios(id),
  archivo_url     TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'panoramica',
  fecha_toma      DATE,
  notas           TEXT,
  uploaded_by     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radiografias_paciente     ON radiografias(paciente_id);
CREATE INDEX IF NOT EXISTS idx_radiografias_consultorio  ON radiografias(consultorio_id);
CREATE INDEX IF NOT EXISTS idx_radiografias_activa       ON radiografias(activa) WHERE activa = TRUE;

-- Sin RLS: backend usa service_role y filtra por consultorio_id.
ALTER TABLE radiografias DISABLE ROW LEVEL SECURITY;
