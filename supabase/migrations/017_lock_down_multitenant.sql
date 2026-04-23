-- Migration: 017_lock_down_multitenant.sql
-- M13 Fase 5a: lock down de la migración multi-tenant.
--
-- Hasta ahora consultorio_id era NULLABLE con DEFAULT 1 (compat hacia atrás).
-- Ahora que el backend SIEMPRE setea consultorio_id en todos los inserts y
-- el frontend manda X-Consultorio-ID en públicos, podemos:
--
-- 1. Hacer NOT NULL la columna en todas las tablas (no más NULL silenciosos)
-- 2. Reemplazar UNIQUE globales por UNIQUE por consultorio (multi-tenant clean)
--
-- Pre-requisito: que TODAS las filas existentes tengan consultorio_id != NULL.
-- La migración 014 ya hizo el backfill, pero verificamos.

-- ── Sanity check antes de hacer NOT NULL ────────────────────────────────────
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  -- Si quedó alguna fila con NULL, fallar la migración antes de romper más
  SELECT COUNT(*) INTO cnt FROM pacientes WHERE consultorio_id IS NULL;
  IF cnt > 0 THEN RAISE EXCEPTION 'pacientes tiene % filas con consultorio_id NULL — backfill antes de migrar', cnt; END IF;

  SELECT COUNT(*) INTO cnt FROM turnos WHERE consultorio_id IS NULL;
  IF cnt > 0 THEN RAISE EXCEPTION 'turnos tiene % filas con consultorio_id NULL', cnt; END IF;

  SELECT COUNT(*) INTO cnt FROM usuarios WHERE consultorio_id IS NULL;
  IF cnt > 0 THEN RAISE EXCEPTION 'usuarios tiene % filas con consultorio_id NULL', cnt; END IF;

  SELECT COUNT(*) INTO cnt FROM casos_galeria WHERE consultorio_id IS NULL;
  IF cnt > 0 THEN RAISE EXCEPTION 'casos_galeria tiene % filas con consultorio_id NULL', cnt; END IF;

  SELECT COUNT(*) INTO cnt FROM alarmas WHERE consultorio_id IS NULL;
  IF cnt > 0 THEN RAISE EXCEPTION 'alarmas tiene % filas con consultorio_id NULL', cnt; END IF;

  SELECT COUNT(*) INTO cnt FROM config_ia WHERE consultorio_id IS NULL;
  IF cnt > 0 THEN RAISE EXCEPTION 'config_ia tiene % filas con consultorio_id NULL', cnt; END IF;
END $$;


-- ── 1. NOT NULL en consultorio_id ───────────────────────────────────────────
ALTER TABLE usuarios          ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE pacientes         ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE turnos            ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE sesiones_agente   ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE casos_galeria     ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE alarmas           ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE config_ia         ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE interacciones     ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE historial_clinico ALTER COLUMN consultorio_id SET NOT NULL;
ALTER TABLE tratamientos      ALTER COLUMN consultorio_id SET NOT NULL;


-- ── 2. UNIQUE compuestos por consultorio ────────────────────────────────────
-- Antes: telefono_hash UNIQUE global → Juan en clínica A bloqueaba a Juan en clínica B
-- Ahora: UNIQUE (consultorio_id, telefono_hash) → cada clínica tiene su propio espacio

-- pacientes: dropear el UNIQUE viejo del telefono_hash, crear compuesto
DROP INDEX IF EXISTS idx_pacientes_telefono_hash_unique;
CREATE UNIQUE INDEX idx_pacientes_consultorio_telefono_hash
  ON pacientes(consultorio_id, telefono_hash)
  WHERE telefono_hash IS NOT NULL;

-- email_hash: igual (por si hay pacientes con email duplicado entre clínicas)
DROP INDEX IF EXISTS idx_pacientes_email_hash;
CREATE UNIQUE INDEX idx_pacientes_consultorio_email_hash
  ON pacientes(consultorio_id, email_hash)
  WHERE email_hash IS NOT NULL;

-- config_ia: clave única por consultorio (cada uno tiene su propio system_prompt, etc)
ALTER TABLE config_ia DROP CONSTRAINT IF EXISTS config_ia_clave_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_ia_consultorio_clave_unique
  ON config_ia(consultorio_id, clave);


-- ── 3. Quitar el DEFAULT 1 (no más fallbacks silenciosos) ───────────────────
ALTER TABLE usuarios          ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE pacientes         ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE turnos            ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE sesiones_agente   ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE casos_galeria     ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE alarmas           ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE config_ia         ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE interacciones     ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE historial_clinico ALTER COLUMN consultorio_id DROP DEFAULT;
ALTER TABLE tratamientos      ALTER COLUMN consultorio_id DROP DEFAULT;

COMMENT ON COLUMN usuarios.consultorio_id          IS 'M13 Fase 5: NOT NULL — lock down completo';
COMMENT ON COLUMN pacientes.consultorio_id         IS 'M13 Fase 5: NOT NULL — UNIQUE compuesto con telefono_hash y email_hash';
COMMENT ON COLUMN turnos.consultorio_id            IS 'M13 Fase 5: NOT NULL';
