-- =============================================================================
-- Migration: 023_rls_multitenant_OPTIONAL.sql
-- =============================================================================
-- Estado: **OPCIONAL — no se aplica automáticamente.**
--
-- ¿Por qué está escrita pero comentada?
--   El backend usa SUPABASE_SERVICE_ROLE_KEY que bypasea RLS por diseño.
--   Por lo tanto habilitar RLS en todas las tablas NO protege contra bugs del
--   backend, solo contra accesos directos con anon key (pacientes OTP +
--   Realtime desde el browser).
--
--   Actualmente sólo `notificaciones` expone lecturas directas desde el
--   browser (Realtime subscribe filtrado por usuario_id). El resto de queries
--   pasa por el backend que filtra por consultorio_id en código.
--
--   Habilitar RLS en caliente puede romper:
--     - Realtime publications (si la política niega al role `supabase_realtime`)
--     - Seed scripts que usen anon key
--     - Algún endpoint que accidentalmente use anon cuando debería service_role
--
--   Por eso esta migración es una **referencia lista para aplicar cuando
--   hayas validado que todo el tráfico sensible pasa por service_role.**
--
-- Cómo aplicarla:
--   1. Descomentá los bloques de abajo, uno por uno (no todos a la vez).
--   2. Desplegá a staging y corré el ESCENARIO E2E del mapa-funcional.
--   3. Si todo anda, desplegá a prod.
--   4. Si algo se rompe: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` para revertir.
--
-- Diseño de las políticas:
--   - `anon` (público sin login): SIN acceso a tablas clínicas sensibles.
--   - `authenticated` (Supabase Auth, staff): acceso limitado a su consultorio.
--     El staff se identifica por su row en usuarios.id == auth.uid().
--   - `service_role`: bypass total (no necesita política, ya lo tiene).
-- =============================================================================

-- ── Helper: devuelve el consultorio_id del usuario autenticado ──────────────
-- Ya existe get_auth_user_rol() de migración 006. Sumamos una para consultorio.
CREATE OR REPLACE FUNCTION get_auth_user_consultorio()
RETURNS INTEGER
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT consultorio_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;


-- ── Políticas propuestas (DISABLED — descomentar para activar) ──────────────
/*

-- ─── PACIENTES ──────────────────────────────────────────────────────────────
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_ve_pacientes_de_su_consultorio" ON pacientes
  FOR SELECT TO authenticated
  USING (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');
CREATE POLICY "staff_crea_pacientes_en_su_consultorio" ON pacientes
  FOR INSERT TO authenticated
  WITH CHECK (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');
CREATE POLICY "staff_edita_pacientes_de_su_consultorio" ON pacientes
  FOR UPDATE TO authenticated
  USING (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');
-- Inserts desde público (formulario de turnos) requieren GRANT + policy anon:
CREATE POLICY "anon_inserta_pacientes" ON pacientes
  FOR INSERT TO anon WITH CHECK (TRUE);
-- anon NO puede SELECT / UPDATE / DELETE pacientes.


-- ─── TURNOS ─────────────────────────────────────────────────────────────────
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_gestiona_turnos_de_su_consultorio" ON turnos
  FOR ALL TO authenticated
  USING (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin')
  WITH CHECK (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');
CREATE POLICY "anon_inserta_turnos" ON turnos
  FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "anon_select_turno_propio" ON turnos
  FOR SELECT TO anon USING (TRUE);  -- el backend filtra por id+paciente_id


-- ─── HISTORIAL CLÍNICO (datos más sensibles — PHI) ──────────────────────────
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo_odontologo_admin_ve_historial" ON historial_clinico
  FOR SELECT TO authenticated
  USING (
    (consultorio_id = get_auth_user_consultorio() AND get_auth_user_rol() IN ('admin', 'odontologo'))
    OR get_auth_user_rol() = 'superadmin'
  );
CREATE POLICY "solo_odontologo_admin_edita_historial" ON historial_clinico
  FOR ALL TO authenticated
  USING (
    (consultorio_id = get_auth_user_consultorio() AND get_auth_user_rol() IN ('admin', 'odontologo'))
    OR get_auth_user_rol() = 'superadmin'
  );
-- NO policy para anon: el paciente lee su historial vía JWT OTP usando el
-- backend con service_role, NO con anon directo. RLS bloquea el uso directo.


-- ─── TRATAMIENTOS ───────────────────────────────────────────────────────────
ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_gestiona_tratamientos" ON tratamientos
  FOR ALL TO authenticated
  USING (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin')
  WITH CHECK (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');


-- ─── RECETAS ────────────────────────────────────────────────────────────────
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_gestiona_recetas" ON recetas
  FOR ALL TO authenticated
  USING (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin')
  WITH CHECK (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');


-- ─── CHAT PACIENTE ↔ ODONTÓLOGO ────────────────────────────────────────────
ALTER TABLE chat_paciente_odontologo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_ve_su_chat" ON chat_paciente_odontologo
  FOR SELECT TO authenticated
  USING (odontologo_id = auth.uid() OR get_auth_user_rol() = 'superadmin');
CREATE POLICY "staff_envia_chat" ON chat_paciente_odontologo
  FOR INSERT TO authenticated
  WITH CHECK (odontologo_id = auth.uid() AND consultorio_id = get_auth_user_consultorio());


-- ─── AUDIT LOG (solo superadmin lee; todos pueden insertar via backend) ─────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo_superadmin_lee_audit" ON audit_log
  FOR SELECT TO authenticated
  USING (get_auth_user_rol() = 'superadmin');


-- ─── RADIOGRAFIAS ──────────────────────────────────────────────────────────
ALTER TABLE radiografias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_ve_radiografias" ON radiografias
  FOR SELECT TO authenticated
  USING (
    (consultorio_id = get_auth_user_consultorio() AND get_auth_user_rol() IN ('admin', 'odontologo'))
    OR get_auth_user_rol() = 'superadmin'
  );
CREATE POLICY "staff_sube_radiografias" ON radiografias
  FOR INSERT TO authenticated
  WITH CHECK (
    consultorio_id = get_auth_user_consultorio()
    AND get_auth_user_rol() IN ('admin', 'odontologo')
  );


-- ─── HORARIOS_DOCTOR ────────────────────────────────────────────────────────
ALTER TABLE horarios_doctor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_ve_horarios_de_su_consultorio" ON horarios_doctor
  FOR SELECT TO authenticated
  USING (consultorio_id = get_auth_user_consultorio() OR get_auth_user_rol() = 'superadmin');
CREATE POLICY "admin_gestiona_horarios" ON horarios_doctor
  FOR ALL TO authenticated
  USING (
    (consultorio_id = get_auth_user_consultorio() AND get_auth_user_rol() = 'admin')
    OR (usuario_id = auth.uid())  -- odontólogo puede editar los suyos
    OR get_auth_user_rol() = 'superadmin'
  )
  WITH CHECK (
    (consultorio_id = get_auth_user_consultorio() AND get_auth_user_rol() = 'admin')
    OR (usuario_id = auth.uid())
    OR get_auth_user_rol() = 'superadmin'
  );

*/

-- =============================================================================
-- Notas importantes al aplicar:
--
-- 1. Las tablas `notificaciones` y `mensajes_agente` se dejan sin RLS porque:
--    - notificaciones: el frontend ya tiene Realtime suscrito con filter por
--      usuario_id. Agregar RLS requeriría cambiar también la policy de la
--      publication supabase_realtime → riesgo alto.
--    - mensajes_agente: el chat público necesita INSERT desde anon. Hoy está
--      GRANT INSERT ... TO anon. Si habilitamos RLS sin una policy permisiva,
--      se rompe el chat. Mejor dejarlo así y que la protección sea en el backend.
--
-- 2. La función get_auth_user_consultorio() SÍ se crea siempre, porque no
--    cambia comportamiento mientras no haya policies que la usen.
--
-- 3. Antes de habilitar cualquier bloque, probar el Escenario 10 (telemedicina
--    E2E) y Escenario 3 (ARCO) del docs/mapa-funcional-y-testing.md.
-- =============================================================================
