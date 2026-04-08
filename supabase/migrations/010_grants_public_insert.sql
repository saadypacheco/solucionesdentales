-- Migration: 010_grants_public_insert.sql
-- En Supabase, RLS policies controlan el acceso condicional pero los GRANT
-- controlan qué operaciones puede hacer cada rol a nivel de tabla.
-- Sin GRANT INSERT, el rol anon da 42501 aunque la policy diga WITH CHECK (TRUE).

-- Permisos de schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- pacientes: anon y authenticated pueden insertar (agendan turnos sin login)
GRANT INSERT ON TABLE public.pacientes TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.pacientes TO authenticated;

-- turnos: anon y authenticated pueden insertar
GRANT INSERT ON TABLE public.turnos TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.turnos TO authenticated;

-- alarmas: anon y authenticated pueden insertar (backend las crea)
GRANT INSERT ON TABLE public.alarmas TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.alarmas TO authenticated;

-- paciente_otps: solo backend (service_role) opera esta tabla
-- No se necesita grant para anon

-- Secuencias (necesario para que los INSERT puedan usar SERIAL/nextval)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
