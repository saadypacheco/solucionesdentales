-- Migration: 024_dominios_consultorio.sql
-- Mapea hostnames (dominios y subdominios) a un consultorio_id, para que el
-- frontend resuelva el tenant automáticamente según window.location.host
-- sin necesidad de hardcodear NEXT_PUBLIC_CONSULTORIO_ID.
--
-- Soporta los 3 modelos del producto:
--   - Single-tenant dedicado: cliente con su propio dominio (dentalbosques.com.ar)
--   - Multi-tenant compartido: subdominios bajo el SaaS (bosques.solucionesdentales.com)
--   - Híbrido: cliente con varios hostnames (default + alias)
--
-- Reglas:
--   - hostname es UNIQUE → no puede haber dos consultorios disputándose el mismo dominio
--   - Cada consultorio puede tener N hostnames; uno marcado como `es_default`
--     se usa para emails / links canónicos
--   - Hostname se guarda en lowercase, sin protocolo, sin puerto, sin trailing slash

CREATE TABLE IF NOT EXISTS dominios_consultorio (
  id              SERIAL PRIMARY KEY,
  consultorio_id  INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,
  hostname        TEXT NOT NULL UNIQUE,
  es_default      BOOLEAN NOT NULL DEFAULT FALSE,
  notas           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dominios_hostname     ON dominios_consultorio(hostname);
CREATE INDEX IF NOT EXISTS idx_dominios_consultorio  ON dominios_consultorio(consultorio_id);

-- Garantizar 1 default por consultorio (parcial unique cuando es_default=TRUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dominios_default_unico
  ON dominios_consultorio(consultorio_id) WHERE es_default = TRUE;

ALTER TABLE dominios_consultorio DISABLE ROW LEVEL SECURITY;

-- Seed: preservar el cliente actual (consultorio_id=1 con solucionodont.shop)
-- y mapear localhost / Vercel preview deploys al mismo consultorio para dev.
INSERT INTO dominios_consultorio (consultorio_id, hostname, es_default, notas)
VALUES
  (1, 'solucionodont.shop',         TRUE,  'Cliente original — dominio propio'),
  (1, 'localhost',                  FALSE, 'Desarrollo local (puerto se ignora en resolución)'),
  (1, 'localhost:3000',             FALSE, 'Desarrollo local con puerto explícito'),
  (1, 'solucionesdentales.vercel.app', FALSE, 'Deploys preview de Vercel')
ON CONFLICT (hostname) DO NOTHING;
