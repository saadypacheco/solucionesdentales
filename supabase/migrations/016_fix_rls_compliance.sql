-- Migration: 016_fix_rls_compliance.sql
-- Fix M13 Fase 3: en migración 013 activé RLS en las tablas nuevas pero
-- sin policies. El backend usa service_role pero el cliente Postgrest custom
-- (db/client.py) no bypassea RLS de forma confiable, entonces todo INSERT/
-- UPDATE en consultorios, documentos_*, audit_log y consentimientos falla
-- con: "new row violates row-level security policy".
--
-- Solución temporal (Fase 3-4): desactivar RLS en estas tablas. Es seguro
-- porque:
--   1. El frontend NO accede directo a estas tablas (todo va vía backend)
--   2. El backend filtra por consultorio_id manualmente en cada query
--   3. La auth de FastAPI (require_staff_context, require_superadmin) ya
--      controla quién puede hacer qué
--
-- En Fase 5 (lock down) reactivamos RLS con policies multi-tenant bien
-- definidas que respetan consultorio_id.

ALTER TABLE consultorios               DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_requeridos_pais DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_consultorio     DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE consentimientos            DISABLE ROW LEVEL SECURITY;

-- paises queda con RLS activo + policy lectura pública (creada en 013).
-- Sirve para que el wizard de onboarding pueda leerla sin auth.
