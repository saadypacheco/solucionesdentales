-- Migration: 012_encriptacion.sql
-- Agrega columnas para datos sensibles encriptados con Fernet (a nivel app).
-- Estrategia: aditiva. Las columnas planas (telefono, email, codigo, notas)
-- se mantienen durante la transición. Una migración futura las dropea.
--
-- Backfill de datos existentes: se ejecuta desde Python al startup del
-- backend si RUN_ENCRYPTION_BACKFILL=true. Idempotente.

-- ── pacientes ────────────────────────────────────────────────────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS telefono_enc TEXT,
  ADD COLUMN IF NOT EXISTS telefono_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_enc TEXT,
  ADD COLUMN IF NOT EXISTS email_hash TEXT;

-- Aflojar restricciones del telefono plano: ahora es legacy, telefono_hash es la clave.
ALTER TABLE pacientes ALTER COLUMN telefono DROP NOT NULL;
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_telefono_key;

-- Índice único para que el hash reemplace al telefono UNIQUE original.
-- Permite NULL múltiples (parcial) durante backfill.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_telefono_hash_unique
  ON pacientes(telefono_hash) WHERE telefono_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_email_hash
  ON pacientes(email_hash) WHERE email_hash IS NOT NULL;

-- ── paciente_otps ────────────────────────────────────────────────────────────
ALTER TABLE paciente_otps
  ADD COLUMN IF NOT EXISTS telefono_hash TEXT,
  ADD COLUMN IF NOT EXISTS codigo_enc TEXT;

CREATE INDEX IF NOT EXISTS idx_otps_telefono_hash
  ON paciente_otps(telefono_hash) WHERE telefono_hash IS NOT NULL;

-- ── turnos ───────────────────────────────────────────────────────────────────
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS notas_enc TEXT;

-- ── usuarios (staff) ─────────────────────────────────────────────────────────
-- email se mantiene UNIQUE en plain porque Supabase Auth lo necesita.
-- email_enc es para protección adicional en reposo (no para login).
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS email_enc TEXT;

-- ── Comentarios para futuras revisiones ──────────────────────────────────────
COMMENT ON COLUMN pacientes.telefono_enc IS 'Fernet token. Reemplaza telefono.';
COMMENT ON COLUMN pacientes.telefono_hash IS 'SHA256(telefono+HASH_SALT). Para búsqueda determinística.';
COMMENT ON COLUMN pacientes.email_enc IS 'Fernet token. Reemplaza email.';
COMMENT ON COLUMN pacientes.email_hash IS 'SHA256(email_lower+HASH_SALT). Búsqueda.';
COMMENT ON COLUMN paciente_otps.telefono_hash IS 'Para validar OTP sin desencriptar.';
COMMENT ON COLUMN paciente_otps.codigo_enc IS 'Fernet token. Reemplaza codigo.';
COMMENT ON COLUMN turnos.notas_enc IS 'Fernet token. Reemplaza notas.';
COMMENT ON COLUMN usuarios.email_enc IS 'Fernet token (email staff cifrado en reposo).';
