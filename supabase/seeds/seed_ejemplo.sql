-- =============================================================
-- SEED DE EJEMPLO — Soluciones Dentales
-- =============================================================
--
-- Este archivo está dividido en dos bloques:
--
-- BLOQUE A: Correr ahora mismo (no depende de auth)
--   → pacientes, sesiones_agente, mensajes_agente, casos_galeria,
--     alarmas, config_ia
--
-- BLOQUE B: Correr DESPUÉS de crear usuarios en Supabase Auth
--   → usuarios, turnos, tratamientos, interacciones, historial_clinico
--
-- =============================================================


-- =============================================================
-- BLOQUE A — Sin dependencia de auth.users
-- =============================================================

-- ─── A1. PACIENTES ───────────────────────────────────────────
INSERT INTO pacientes (telefono, nombre, email, score, estado, proxima_accion, verificado) VALUES
  ('1134567890', 'María González',   'maria.g@gmail.com',   80,  'paciente_activo', 'Citar para control en 6 meses',          true),
  ('1145678901', 'Juan Pérez',       NULL,                   50,  'turno_agendado',  'Confirmar turno por WhatsApp',           false),
  ('1156789012', 'Laura Fernández',  'laura.f@hotmail.com', 110, 'paciente_activo', 'Ofrecer blanqueamiento post-ortodoncia', true),
  ('1167890123', 'Roberto Silva',    NULL,                   30,  'turno_agendado',  NULL,                                    false),
  ('1178901234', 'Valentina Torres', 'valen.t@gmail.com',   20,  'contactado',      'Seguimiento — no respondió WA',         false),
  ('1189012345', 'Diego Morales',    NULL,                   0,   'nuevo',           NULL,                                    false);


-- ─── A2. SESIONES AGENTE ─────────────────────────────────────
INSERT INTO sesiones_agente (session_id, paciente_id) VALUES
  ('sess_abc123def456', 2),
  ('sess_xyz789uvw012', NULL),
  ('sess_mno345pqr678', 5);

-- ─── A3. MENSAJES AGENTE ─────────────────────────────────────
INSERT INTO mensajes_agente (sesion_id, rol, contenido, es_bot) VALUES
  (1, 'user',  'Hola, quiero saber cuánto sale la ortodoncia', false),
  (1, 'model', 'Hola! Te cuento que ofrecemos ortodoncia metálica y estética. Lo mejor es agendar una consulta sin cargo para que el odontólogo evalúe tu caso. ¿Querés que te reserve un turno?', true),
  (1, 'user',  'Sí, ¿tienen disponibilidad esta semana?', false),
  (1, 'model', '¡Sí! Tenemos turnos disponibles a partir de mañana. Podés reservar en solucionesdentales.com/turnos o decime tu nombre y teléfono y te ayudo ahora.', true),
  (2, 'user',  'Tengo un dolor fuerte en una muela', false),
  (2, 'model', 'Entiendo, los dolores dentales son urgentes. Tenemos turnos de urgencia disponibles hoy. ¿Podés venir?', true);


-- ─── A4. GALERÍA DE CASOS ────────────────────────────────────
-- Reemplazar URLs luego de subir fotos al bucket "casos" en Supabase Storage
INSERT INTO casos_galeria (tipo_tratamiento, descripcion, imagen_antes_url, imagen_despues_url, duracion_tratamiento, aprobado) VALUES
  ('blanqueamiento', 'Blanqueamiento LED en paciente con manchas por café',
   'https://xxx.supabase.co/storage/v1/object/public/casos/blanc_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/blanc_despues_01.jpg',
   '1 sesión · 90 min', true),
  ('ortodoncia', 'Corrección de apiñamiento dental severo',
   'https://xxx.supabase.co/storage/v1/object/public/casos/orto_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/orto_despues_01.jpg',
   '18 meses', true),
  ('estetica', 'Carillas de porcelana — sonrisa completa',
   'https://xxx.supabase.co/storage/v1/object/public/casos/car_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/car_despues_01.jpg',
   '2 sesiones · 3 semanas', false);


-- ─── A5. ALARMAS ─────────────────────────────────────────────
INSERT INTO alarmas (tipo, paciente_id, titulo, descripcion, prioridad, resuelta) VALUES
  ('nuevo_turno',        2, 'Nuevo turno solicitado — Juan Pérez',    'ortodoncia · pendiente de confirmación',                        'alta',  false),
  ('nuevo_turno',        4, 'Nuevo turno solicitado — Roberto Silva', 'limpieza · pendiente de confirmación',                          'alta',  false),
  ('paciente_sin_turno', 5, 'Valentina Torres sin respuesta',         'No respondió el mensaje de seguimiento enviado hace 3 días',    'media', false),
  ('recordatorio',       1, 'Control semestral — María González',     'Último turno hace 6 meses. Contactar para reprogramar.',        'baja',  false);


-- ─── A6. CONFIG IA ───────────────────────────────────────────
-- Actualizar número de WhatsApp (ya existe por migración 003)
UPDATE config_ia SET valor = '5491123456789' WHERE clave = 'wa_numero';
-- Reemplazar con: 549 + código de área sin 0 + número sin 15
-- Ejemplo CABA: 5491134567890


-- =============================================================
-- BLOQUE B — Requiere usuarios reales en Supabase Auth
-- =============================================================
--
-- PASOS PREVIOS:
--   1. Ir a Supabase → Authentication → Users → Invite user
--   2. Crear los 4 usuarios con sus emails
--   3. Copiar los UUIDs generados por Supabase
--   4. Reemplazar los 4 UUIDs de abajo y correr este bloque
--
-- =============================================================

-- ─── B1. USUARIOS (STAFF) ────────────────────────────────────
-- !! REEMPLAZAR UUIDs con los de auth.users reales !!
INSERT INTO usuarios (id, email, nombre, rol, especialidades) VALUES
  ('REEMPLAZAR-UUID-ADMIN',    'admin@solucionesdentales.com',  'Dr. Martín Rodríguez', 'admin',        '{}'),
  ('REEMPLAZAR-UUID-GARCIA',   'garcia@solucionesdentales.com', 'Dra. Ana García',      'odontologo',   '{limpieza,blanqueamiento}'),
  ('REEMPLAZAR-UUID-LOPEZ',    'lopez@solucionesdentales.com',  'Dr. Carlos López',     'odontologo',   '{ortodoncia,estetica,implante}'),
  ('REEMPLAZAR-UUID-RECEP',    'recep@solucionesdentales.com',  'Sofía Martínez',       'recepcionista','{}');
-- especialidades vacío ({}) = atiende todos los tratamientos


-- ─── B2. TURNOS ──────────────────────────────────────────────
-- !! REEMPLAZAR UUIDs !!
INSERT INTO turnos (paciente_id, usuario_id, fecha_hora, duracion_minutos, tipo_tratamiento, estado, notas) VALUES
  (1, 'REEMPLAZAR-UUID-GARCIA', NOW() + INTERVAL '1 day'  + TIME '10:00:00', 30, 'limpieza',   'confirmado', 'Control de rutina'),
  (2, 'REEMPLAZAR-UUID-LOPEZ',  NOW() + INTERVAL '2 days' + TIME '11:30:00', 30, 'ortodoncia', 'solicitado', 'Primera consulta'),
  (3, 'REEMPLAZAR-UUID-LOPEZ',  NOW() + INTERVAL '3 days' + TIME '09:00:00', 60, 'estetica',   'confirmado', 'Carillas piezas 11 y 21'),
  (4, 'REEMPLAZAR-UUID-GARCIA', NOW() + INTERVAL '1 day'  + TIME '15:00:00', 30, 'limpieza',   'solicitado', NULL),
  (1, 'REEMPLAZAR-UUID-LOPEZ',  NOW() - INTERVAL '30 days',                  90, 'implante',   'realizado',  'Implante pieza 36 — exitoso'),
  (3, 'REEMPLAZAR-UUID-LOPEZ',  NOW() - INTERVAL '60 days',                  30, 'ortodoncia', 'realizado',  'Colocación de brackets');


-- ─── B3. HISTORIAL CLÍNICO ───────────────────────────────────
INSERT INTO historial_clinico (paciente_id, alergias, medicacion, antecedentes) VALUES
  (1, '{penicilina}',       '{}',                          'Hipertensión leve. Precaución con vasoconstrictores.'),
  (3, '{}',                 '{ibuprofeno 400mg ocasional}', 'Sin antecedentes relevantes.'),
  (4, '{latex,lidocaina}',  '{}',                          'Alergia al latex. Usar guantes sin latex. Anestesia con mepivacaína.');


-- ─── B4. TRATAMIENTOS ────────────────────────────────────────
-- !! REEMPLAZAR UUIDs !!
INSERT INTO tratamientos (paciente_id, usuario_id, descripcion, fecha, estado, costo, notas) VALUES
  (1, 'REEMPLAZAR-UUID-GARCIA', 'Limpieza y detartrado',        (NOW() - INTERVAL '6 months')::date, 'completado', 8500.00,   'Sin inconvenientes.'),
  (3, 'REEMPLAZAR-UUID-LOPEZ',  'Ortodoncia metálica completa', (NOW() - INTERVAL '8 months')::date, 'en_curso',   120000.00, 'Brackets colocados. Control mensual.'),
  (1, 'REEMPLAZAR-UUID-LOPEZ',  'Implante pieza 36',            (NOW() - INTERVAL '30 days')::date,  'completado', 95000.00,  'Osteointegración exitosa.'),
  (5, 'REEMPLAZAR-UUID-GARCIA', 'Blanqueamiento LED',           (NOW() - INTERVAL '2 months')::date, 'completado', 25000.00,  'Resultado: 4 tonos más claro.');


-- ─── B5. INTERACCIONES ───────────────────────────────────────
INSERT INTO interacciones (paciente_id, tipo, contenido) VALUES
  (1, 'turno',      'Turno confirmado — limpieza mañana 10:00'),
  (1, 'mensaje_wa', 'Paciente confirmó asistencia por WhatsApp'),
  (2, 'chat',       'Consultó por precio de ortodoncia invisible'),
  (3, 'llamada',    'Llamó para adelantar el turno. Sin disponibilidad hasta el jueves.'),
  (5, 'mensaje_wa', 'Se envió mensaje de seguimiento. Sin respuesta.'),
  (3, 'nota',       'Paciente interesada en blanqueamiento post-ortodoncia. Mencionarlo en próxima visita.');
