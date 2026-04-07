-- Migration: 009_fix_rls_insert_definitivo.sql
-- Separa explícitamente las policies por operación para evitar conflictos.
-- FOR ALL sin WITH CHECK usa USING también en INSERT → bloquea inserts anónimos.

-- ── PACIENTES ──
DROP POLICY IF EXISTS "Staff puede ver pacientes" ON pacientes;
DROP POLICY IF EXISTS "Público puede crear paciente" ON pacientes;

-- Lectura/edición: solo staff autenticado
CREATE POLICY "Staff lee pacientes" ON pacientes
  FOR SELECT USING (get_auth_user_rol() IN ('admin','odontologo','recepcionista'));

CREATE POLICY "Staff edita pacientes" ON pacientes
  FOR UPDATE USING (get_auth_user_rol() IN ('admin','odontologo','recepcionista'));

-- INSERT: público (backend crea pacientes al agendar turnos sin login)
CREATE POLICY "Publico inserta paciente" ON pacientes
  FOR INSERT WITH CHECK (TRUE);


-- ── TURNOS ──
DROP POLICY IF EXISTS "Staff gestiona turnos" ON turnos;
DROP POLICY IF EXISTS "Público puede crear turno" ON turnos;

CREATE POLICY "Staff lee turnos" ON turnos
  FOR SELECT USING (get_auth_user_rol() IN ('admin','odontologo','recepcionista'));

CREATE POLICY "Staff edita turnos" ON turnos
  FOR UPDATE USING (get_auth_user_rol() IN ('admin','odontologo','recepcionista'));

-- INSERT: público (pacientes anónimos agendan turnos)
CREATE POLICY "Publico inserta turno" ON turnos
  FOR INSERT WITH CHECK (TRUE);


-- ── ALARMAS ──
DROP POLICY IF EXISTS "Staff gestiona alarmas" ON alarmas;
DROP POLICY IF EXISTS "Backend puede insertar alarmas" ON alarmas;
DROP POLICY IF EXISTS "Staff ve y resuelve alarmas" ON alarmas;

CREATE POLICY "Staff lee alarmas" ON alarmas
  FOR SELECT USING (get_auth_user_rol() IN ('admin','odontologo','recepcionista'));

CREATE POLICY "Staff edita alarmas" ON alarmas
  FOR UPDATE USING (get_auth_user_rol() IN ('admin','odontologo','recepcionista'));

-- INSERT: público (backend inserta alarmas sin usuario autenticado)
CREATE POLICY "Publico inserta alarma" ON alarmas
  FOR INSERT WITH CHECK (TRUE);


-- ── PACIENTE_OTPS ──
-- Solo el backend opera esta tabla (service_role bypasea RLS automáticamente)
-- No necesita policies adicionales
