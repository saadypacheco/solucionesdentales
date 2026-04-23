-- Migration: 021_horarios_doctor.sql
-- Permite que cada doctor configure su disponibilidad horaria por día de semana.
-- Si un doctor no tiene filas en esta tabla, se aplican los defaults del backend
-- (9-19 lun-vie, 9-13 sáb, cerrado dom).
--
-- dia_semana: 0=lunes, 1=martes, 2=miércoles, 3=jueves, 4=viernes, 5=sábado, 6=domingo
-- (alineado con datetime.weekday() de Python)

CREATE TABLE IF NOT EXISTS horarios_doctor (
  id            SERIAL PRIMARY KEY,
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id),
  dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT horarios_doctor_unique UNIQUE (usuario_id, dia_semana),
  CONSTRAINT horarios_doctor_orden CHECK (hora_inicio < hora_fin)
);

CREATE INDEX IF NOT EXISTS idx_horarios_doctor_usuario   ON horarios_doctor(usuario_id);
CREATE INDEX IF NOT EXISTS idx_horarios_doctor_consultorio ON horarios_doctor(consultorio_id);

-- Sin RLS — el backend usa service_role y filtra por consultorio_id.
ALTER TABLE horarios_doctor DISABLE ROW LEVEL SECURITY;
