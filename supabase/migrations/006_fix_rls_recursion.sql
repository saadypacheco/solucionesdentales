-- Migration: 006_fix_rls_recursion.sql
-- Corrige la recursión infinita en las policies de usuarios
-- El problema: "Admin ve todos" hace SELECT FROM usuarios dentro de una policy ON usuarios → loop

-- 1. Crear función SECURITY DEFINER que obtiene el rol sin disparar RLS
CREATE OR REPLACE FUNCTION get_auth_user_rol()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER   -- se ejecuta con privilegios del owner, sin aplicar RLS
STABLE
SET search_path = public
AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid()
$$;

-- 2. Reemplazar la policy recursiva en usuarios
DROP POLICY IF EXISTS "Admin ve todos" ON usuarios;
CREATE POLICY "Admin ve todos" ON usuarios FOR SELECT
  USING (get_auth_user_rol() = 'admin');

-- 3. Reemplazar todas las demás policies que también usan el patrón recursivo
-- (pacientes, turnos, etc. usan la misma sub-query)

DROP POLICY IF EXISTS "Staff puede ver pacientes" ON pacientes;
CREATE POLICY "Staff puede ver pacientes" ON pacientes FOR ALL
  USING (get_auth_user_rol() IN ('admin', 'odontologo', 'recepcionista'));

DROP POLICY IF EXISTS "Staff gestiona turnos" ON turnos;
CREATE POLICY "Staff gestiona turnos" ON turnos FOR ALL
  USING (get_auth_user_rol() IN ('admin', 'odontologo', 'recepcionista'));

-- Si existen en otras tablas, también las corregimos
DROP POLICY IF EXISTS "Staff ve sesiones" ON sesiones_agente;
CREATE POLICY "Staff ve sesiones" ON sesiones_agente FOR SELECT
  USING (get_auth_user_rol() IN ('admin', 'odontologo', 'recepcionista'));

DROP POLICY IF EXISTS "Solo admin edita config IA" ON config_ia;
CREATE POLICY "Solo admin edita config IA" ON config_ia FOR ALL
  USING (get_auth_user_rol() = 'admin');
