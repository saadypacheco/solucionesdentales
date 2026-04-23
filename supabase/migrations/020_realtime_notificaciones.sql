-- Migration: 020_realtime_notificaciones.sql
-- Habilita Supabase Realtime para la tabla notificaciones.
-- El frontend hace .channel() y se suscribe a INSERT events filtrados
-- por usuario_id (staff) o paciente_id (paciente).

-- Agregar a la publication de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
