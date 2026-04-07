-- Migration: 007_rls_public_insert.sql
-- El flujo de turnos es público: cualquier visitante puede crear un paciente y turno.
-- Las policies actuales solo permiten staff, bloqueando el INSERT desde el backend.

-- pacientes: permitir INSERT público (el backend crea pacientes al agendar turnos)
CREATE POLICY "Público puede crear paciente" ON pacientes
  FOR INSERT WITH CHECK (TRUE);

-- turnos: permitir INSERT público (pacientes anónimos agendan turnos)
CREATE POLICY "Público puede crear turno" ON turnos
  FOR INSERT WITH CHECK (TRUE);

-- alarmas: el backend inserta alarmas (no hay usuario autenticado en ese contexto)
ALTER TABLE alarmas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff gestiona alarmas" ON alarmas;
CREATE POLICY "Backend puede insertar alarmas" ON alarmas
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Staff ve y resuelve alarmas" ON alarmas
  FOR ALL USING (get_auth_user_rol() IN ('admin', 'odontologo', 'recepcionista'));
