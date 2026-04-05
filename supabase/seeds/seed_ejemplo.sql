-- =============================================================
-- SEED DE EJEMPLO — Soluciones Dentales
-- =============================================================
-- IMPORTANTE: La tabla `usuarios` referencia auth.users(id).
-- Primero crear los usuarios en Supabase Auth (Authentication → Users → Invite)
-- y reemplazar los UUIDs de abajo con los generados por Supabase.
-- =============================================================


-- ─── 1. USUARIOS (STAFF) ─────────────────────────────────────
-- Reemplazar UUIDs con los de auth.users reales
INSERT INTO usuarios (id, email, nombre, rol, especialidades) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@solucionesdentales.com',   'Dr. Martín Rodríguez', 'admin',        '{}'),
  ('00000000-0000-0000-0000-000000000002', 'garcia@solucionesdentales.com',  'Dra. Ana García',      'odontologo',   '{limpieza,blanqueamiento}'),
  ('00000000-0000-0000-0000-000000000003', 'lopez@solucionesdentales.com',   'Dr. Carlos López',     'odontologo',   '{ortodoncia,estetica,implante}'),
  ('00000000-0000-0000-0000-000000000004', 'recep@solucionesdentales.com',   'Sofía Martínez',       'recepcionista','{}');
-- especialidades vacío ({}) = atiende todos los tratamientos


-- ─── 2. PACIENTES ────────────────────────────────────────────
INSERT INTO pacientes (telefono, nombre, email, score, estado, proxima_accion, verificado) VALUES
  ('1134567890', 'María González',    'maria.g@gmail.com',   80,  'paciente_activo',  'Citar para control en 6 meses',          true),
  ('1145678901', 'Juan Pérez',        NULL,                   50,  'turno_agendado',   'Confirmar turno por WhatsApp',           false),
  ('1156789012', 'Laura Fernández',   'laura.f@hotmail.com', 110, 'paciente_activo',  'Ofrecer blanqueamiento post-ortodoncia', true),
  ('1167890123', 'Roberto Silva',     NULL,                   30,  'turno_agendado',   NULL,                                    false),
  ('1178901234', 'Valentina Torres',  'valen.t@gmail.com',   20,  'contactado',       'Seguimiento — no respondió WA',         false),
  ('1189012345', 'Diego Morales',     NULL,                   0,   'nuevo',            NULL,                                    false);


-- ─── 3. TURNOS ───────────────────────────────────────────────
-- usuario_id debe ser UUID de un odontólogo de la tabla usuarios
INSERT INTO turnos (paciente_id, usuario_id, fecha_hora, duracion_minutos, tipo_tratamiento, estado, notas) VALUES
  (1, '00000000-0000-0000-0000-000000000002', NOW() + INTERVAL '1 day 10:00:00',  30, 'limpieza',      'confirmado', 'Control de rutina'),
  (2, '00000000-0000-0000-0000-000000000003', NOW() + INTERVAL '2 days 11:30:00', 30, 'ortodoncia',    'solicitado', 'Primera consulta de ortodoncia'),
  (3, '00000000-0000-0000-0000-000000000003', NOW() + INTERVAL '3 days 09:00:00', 60, 'estetica',      'confirmado', 'Carillas en piezas 11 y 21'),
  (4, '00000000-0000-0000-0000-000000000002', NOW() + INTERVAL '1 day 15:00:00',  30, 'limpieza',      'solicitado', NULL),
  (1, '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '30 days',         90, 'implante',      'realizado',  'Implante pieza 36 — exitoso'),
  (3, '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '60 days',         30, 'ortodoncia',    'realizado',  'Colocación de brackets');


-- ─── 4. INTERACCIONES ────────────────────────────────────────
INSERT INTO interacciones (paciente_id, tipo, contenido) VALUES
  (1, 'turno',      'Turno confirmado para limpieza — mañana 10:00'),
  (1, 'mensaje_wa', 'Paciente confirmó asistencia por WhatsApp'),
  (2, 'chat',       'Consultó por precio de ortodoncia invisible'),
  (3, 'llamada',    'Llamó para adelantar el turno. Sin disponibilidad hasta el jueves.'),
  (5, 'mensaje_wa', 'Se envió mensaje de seguimiento. Sin respuesta.'),
  (3, 'nota',       'Paciente interesada en blanqueamiento post-ortodoncia. Mencionarlo en próxima visita.');


-- ─── 5. HISTORIAL CLÍNICO ────────────────────────────────────
INSERT INTO historial_clinico (paciente_id, alergias, medicacion, antecedentes) VALUES
  (1, '{penicilina}',                          '{}',                         'Hipertensión leve. Tomar precaución con vasoconstrictores.'),
  (3, '{}',                                    '{ibuprofeno 400mg ocasional}','Sin antecedentes relevantes.'),
  (4, '{latex, lidocaina}',                    '{}',                         'Alergia al latex confirmada. Usar guantes sin latex. Anestesia con mepivacaína.');


-- ─── 6. TRATAMIENTOS (realizados o en curso) ─────────────────
INSERT INTO tratamientos (paciente_id, usuario_id, descripcion, fecha, estado, costo, notas) VALUES
  (1, '00000000-0000-0000-0000-000000000002', 'Limpieza y detartrado',            NOW() - INTERVAL '6 months', 'completado', 8500.00,  'Sin inconvenientes.'),
  (3, '00000000-0000-0000-0000-000000000003', 'Ortodoncia metálica completa',     NOW() - INTERVAL '8 months', 'en_curso',   120000.00,'Brackets colocados. Control mensual.'),
  (1, '00000000-0000-0000-0000-000000000003', 'Implante pieza 36',                NOW() - INTERVAL '30 days',  'completado', 95000.00, 'Osteointegración exitosa.'),
  (5, '00000000-0000-0000-0000-000000000002', 'Blanqueamiento LED',               NOW() - INTERVAL '2 months', 'completado', 25000.00, 'Resultado: 4 tonos más claro.');


-- ─── 7. SESIONES AGENTE (chat IA del sitio) ──────────────────
INSERT INTO sesiones_agente (session_id, paciente_id) VALUES
  ('sess_abc123def456', 2),
  ('sess_xyz789uvw012', NULL),
  ('sess_mno345pqr678', 5);


-- ─── 8. MENSAJES AGENTE ──────────────────────────────────────
-- sesion_id 1 → paciente Juan Pérez (id=2)
INSERT INTO mensajes_agente (sesion_id, rol, contenido, es_bot) VALUES
  (1, 'user',  'Hola, quiero saber cuánto sale la ortodoncia',              false),
  (1, 'model', 'Hola! Te cuento que ofrecemos ortodoncia metálica y estética. El valor depende del caso, lo mejor es agendar una consulta sin cargo para que el Dr. López evalúe tu situación. ¿Querés que te reserve un turno?', true),
  (1, 'user',  'Sí, ¿tienen disponibilidad esta semana?',                   false),
  (1, 'model', '¡Sí! Tenemos turnos disponibles a partir de mañana. Podés reservar directamente en solucionesdentales.com/turnos o si preferís te atiendo yo ahora. ¿Cuál es tu nombre y teléfono?', true),
  -- sesion_id 2 → anónimo
  (2, 'user',  'Buenas, tengo un dolor fuerte en una muela',                false),
  (2, 'model', 'Entiendo, los dolores dentales pueden ser muy molestos. Te recomiendo agendar una urgencia hoy mismo. Tenemos turnos de urgencia disponibles. ¿Podés venir hoy?', true);


-- ─── 9. GALERÍA DE CASOS ─────────────────────────────────────
-- imagen_antes_url / imagen_despues_url: subir fotos al bucket "casos" en Supabase Storage
-- y reemplazar las URLs de abajo
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
   '2 sesiones · 3 semanas', false);  -- aprobado=false: no se muestra públicamente


-- ─── 10. ALARMAS ─────────────────────────────────────────────
INSERT INTO alarmas (tipo, paciente_id, titulo, descripcion, prioridad, resuelta) VALUES
  ('nuevo_turno',         2, 'Nuevo turno solicitado — Juan Pérez',      'ortodoncia el ' || TO_CHAR(NOW() + INTERVAL '2 days', 'DD/MM/YYYY') || ' 11:30', 'alta',  false),
  ('nuevo_turno',         4, 'Nuevo turno solicitado — Roberto Silva',   'limpieza el '   || TO_CHAR(NOW() + INTERVAL '1 day',  'DD/MM/YYYY') || ' 15:00', 'alta',  false),
  ('paciente_sin_turno',  5, 'Valentina Torres sin respuesta',           'No respondió el mensaje de seguimiento enviado hace 3 días',                       'media', false),
  ('recordatorio',        1, 'Control semestral — María González',       'Último turno hace 6 meses. Contactar para reprogramar.',                           'baja',  false),
  ('nuevo_turno',         3, 'Turno completado — Laura Fernández',       'Carillas realizadas. Evaluar blanqueamiento.',                                     'baja',  true);


-- ─── 11. CONFIG IA (ya insertada en 003, actualizar si hace falta) ─
UPDATE config_ia SET valor = '5491123456789' WHERE clave = 'wa_numero';
-- Reemplazar con el número real de WhatsApp Business (formato: 549 + código de área + número)
