-- Migration: 014_consultorio_id_fk.sql
-- M13 Fase 2: agrega consultorio_id a tablas existentes.
--
-- Estrategia: nullable + DEFAULT 1 (consultorio creado en 013). Los datos
-- existentes quedan vinculados al "Consultorio default" sin perder nada.
-- En Fase 5 (lock down) lo pasamos a NOT NULL una vez que la app filtre
-- siempre por consultorio_id.

-- ── Tablas que reciben consultorio_id ───────────────────────────────────────
ALTER TABLE usuarios          ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE pacientes         ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE turnos            ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE sesiones_agente   ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE casos_galeria     ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE alarmas           ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE config_ia         ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE interacciones     ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;
ALTER TABLE tratamientos      ADD COLUMN IF NOT EXISTS consultorio_id INTEGER REFERENCES consultorios(id) DEFAULT 1;

-- Backfill explícito por si algún UPDATE futuro deja NULL (idempotente)
UPDATE usuarios          SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE pacientes         SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE turnos            SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE sesiones_agente   SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE casos_galeria     SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE alarmas           SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE config_ia         SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE interacciones     SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE historial_clinico SET consultorio_id = 1 WHERE consultorio_id IS NULL;
UPDATE tratamientos      SET consultorio_id = 1 WHERE consultorio_id IS NULL;

-- Setear odontologo_titular del consultorio default al primer admin que exista
UPDATE consultorios
SET odontologo_titular_id = (
  SELECT id FROM usuarios WHERE rol = 'admin' AND activo = TRUE ORDER BY created_at LIMIT 1
)
WHERE id = 1 AND odontologo_titular_id IS NULL;

-- ── Índices para queries multi-tenant frecuentes ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usuarios_consultorio          ON usuarios(consultorio_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_consultorio         ON pacientes(consultorio_id);
CREATE INDEX IF NOT EXISTS idx_turnos_consultorio_fecha      ON turnos(consultorio_id, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_casos_consultorio             ON casos_galeria(consultorio_id);
CREATE INDEX IF NOT EXISTS idx_alarmas_consultorio_resuelta  ON alarmas(consultorio_id, resuelta);
CREATE INDEX IF NOT EXISTS idx_interacciones_consultorio     ON interacciones(consultorio_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_consultorio      ON tratamientos(consultorio_id);
CREATE INDEX IF NOT EXISTS idx_config_ia_consultorio_clave   ON config_ia(consultorio_id, clave);

-- Telefono UNIQUE de pacientes ahora debería ser por (consultorio_id, telefono_hash).
-- El UNIQUE actual es global → en multi-tenant un mismo teléfono puede estar
-- en distintos consultorios. Lo arreglamos en Fase 5 (lock down) cuando todos
-- los inserts ya pasen consultorio_id. Por ahora queda UNIQUE global porque
-- todos los pacientes son del consultorio 1.

-- Misma lógica para config_ia.clave: debería ser UNIQUE (consultorio_id, clave).
-- Por ahora se mantiene UNIQUE global. Se ajusta en Fase 5.

COMMENT ON COLUMN usuarios.consultorio_id          IS 'M13 Fase 2: nullable hasta Fase 5 lock down';
COMMENT ON COLUMN pacientes.consultorio_id         IS 'M13 Fase 2: nullable hasta Fase 5 lock down';
COMMENT ON COLUMN turnos.consultorio_id            IS 'M13 Fase 2: nullable hasta Fase 5 lock down';
