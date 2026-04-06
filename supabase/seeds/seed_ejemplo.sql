-- =============================================================
-- SEED DE EJEMPLO — Soluciones Dentales
-- =============================================================
-- Seguro para correr múltiples veces:
--   • TRUNCATE limpia las tablas con IDs seriales (reinicia IDs)
--   • usuarios usa ON CONFLICT DO NOTHING (no toca auth.users)
-- =============================================================

-- Limpiar tablas con datos de ejemplo (respeta FKs con CASCADE)
TRUNCATE TABLE
  mensajes_agente,
  sesiones_agente,
  interacciones,
  alarmas,
  tratamientos,
  historial_clinico,
  turnos,
  casos_galeria,
  pacientes
RESTART IDENTITY CASCADE;


-- ─── 1. USUARIOS (STAFF) ─────────────────────────────────────
-- ON CONFLICT DO NOTHING: si ya existen, no falla ni los pisa
INSERT INTO usuarios (id, email, nombre, rol, especialidades) VALUES
  ('c457e4f8-876c-46ed-a3ca-489789426cc6', 'admin@solucionesdentales.com',  'Dr. Martín Rodríguez', 'admin',      '{}'),
  ('2f3b185a-bc76-437b-9088-3f63759144dc', 'garcia@solucionesdentales.com', 'Dra. Ana García',      'odontologo', '{estetica}')
ON CONFLICT (id) DO NOTHING;

-- Para agregar más doctores: crear en Auth → copiar UUID → descomentar
-- INSERT INTO usuarios (id, email, nombre, rol, especialidades) VALUES
--   ('REEMPLAZAR-UUID', 'lopez@solucionesdentales.com',  'Dr. Carlos López',   'odontologo', '{ortodoncia,consulta}'),
--   ('REEMPLAZAR-UUID', 'torres@solucionesdentales.com', 'Dra. Paula Torres',  'odontologo', '{limpieza,blanqueamiento,urgencia}'),
--   ('REEMPLAZAR-UUID', 'vargas@solucionesdentales.com', 'Dr. Ignacio Vargas', 'odontologo', '{implante,urgencia}'),
--   ('REEMPLAZAR-UUID', 'recep@solucionesdentales.com',  'Sofía Martínez',     'recepcionista', '{}')
-- ON CONFLICT (id) DO NOTHING;


-- ─── 2. PACIENTES ────────────────────────────────────────────
INSERT INTO pacientes (telefono, nombre, email, score, estado, proxima_accion, verificado) VALUES
  ('1134567890', 'María González',    'maria.g@gmail.com',   80,  'paciente_activo', 'Citar para control en 6 meses',          true),
  ('1145678901', 'Juan Pérez',        NULL,                   50,  'turno_agendado',  'Confirmar turno por WhatsApp',           false),
  ('1156789012', 'Laura Fernández',   'laura.f@hotmail.com', 110, 'paciente_activo', 'Ofrecer blanqueamiento post-ortodoncia', true),
  ('1167890123', 'Roberto Silva',     NULL,                   30,  'turno_agendado',  NULL,                                    false),
  ('1178901234', 'Valentina Torres',  'valen.t@gmail.com',   20,  'contactado',      'Seguimiento — no respondió WA',         false),
  ('1189012345', 'Diego Morales',     NULL,                   0,   'nuevo',           NULL,                                    false),
  ('1190123456', 'Claudia Romero',    'clau.r@gmail.com',    90,  'paciente_activo', 'Recordar turno de mantenimiento',        true),
  ('1201234567', 'Sebastián Núñez',   NULL,                   60,  'paciente_activo', NULL,                                    false),
  ('1212345678', 'Florencia Aguirre', 'flor.a@hotmail.com',  40,  'interesado',      'Enviar presupuesto de implante',         false);
-- IDs resultantes: María=1, Juan=2, Laura=3, Roberto=4, Valentina=5, Diego=6, Claudia=7, Sebastián=8, Florencia=9


-- ─── 3. TURNOS ───────────────────────────────────────────────
INSERT INTO turnos (paciente_id, usuario_id, fecha_hora, duracion_minutos, tipo_tratamiento, estado, notas) VALUES
  -- Futuros
  (4, '2f3b185a-bc76-437b-9088-3f63759144dc', NOW() + INTERVAL '1 day'  + TIME '15:00:00', 60, 'estetica', 'solicitado', NULL),
  (9, '2f3b185a-bc76-437b-9088-3f63759144dc', NOW() + INTERVAL '3 days' + TIME '10:00:00', 60, 'estetica', 'confirmado', 'Consulta inicial para carillas'),
  -- Pasados — realizados
  (1, '2f3b185a-bc76-437b-9088-3f63759144dc', NOW() - INTERVAL '30 days',                  90, 'implante',  'realizado', 'Implante pieza 36 — exitoso'),
  (3, '2f3b185a-bc76-437b-9088-3f63759144dc', NOW() - INTERVAL '60 days',                  60, 'estetica',  'realizado', 'Carillas en piezas 11 y 21'),
  (7, '2f3b185a-bc76-437b-9088-3f63759144dc', NOW() - INTERVAL '15 days',                  60, 'estetica',  'realizado', 'Diseño de sonrisa completo'),
  (8, '2f3b185a-bc76-437b-9088-3f63759144dc', NOW() - INTERVAL '45 days',                  60, 'estetica',  'realizado', 'Carillas anteriores'),
  (1, 'c457e4f8-876c-46ed-a3ca-489789426cc6', NOW() - INTERVAL '90 days',                  30, 'consulta',  'realizado', 'Primera consulta general'),
  (5, 'c457e4f8-876c-46ed-a3ca-489789426cc6', NOW() - INTERVAL '10 days',                  30, 'consulta',  'realizado', 'Derivada para presupuesto de implante');


-- ─── 4. HISTORIAL CLÍNICO ────────────────────────────────────
INSERT INTO historial_clinico (paciente_id, alergias, medicacion, antecedentes) VALUES
  (1, '{penicilina}',      '{}',                           'Hipertensión leve. Precaución con vasoconstrictores.'),
  (3, '{}',                '{ibuprofeno 400mg ocasional}', 'Sin antecedentes relevantes.'),
  (4, '{latex,lidocaina}', '{}',                           'Alergia al latex. Usar guantes sin latex. Anestesia con mepivacaína.'),
  (7, '{}',                '{}',                           'Sensibilidad dental alta. Usar anestesia tópica previa.'),
  (9, '{aspirina}',        '{omeprazol 20mg}',             'Gastritis crónica. Evitar AINEs post-operatorio.');


-- ─── 5. TRATAMIENTOS ─────────────────────────────────────────
INSERT INTO tratamientos (paciente_id, usuario_id, descripcion, fecha, estado, costo, notas) VALUES
  (3, '2f3b185a-bc76-437b-9088-3f63759144dc', 'Carillas de porcelana piezas 11-21', (NOW() - INTERVAL '60 days')::date, 'completado', 180000.00, '6 carillas. Resultado excelente.'),
  (7, '2f3b185a-bc76-437b-9088-3f63759144dc', 'Diseño de sonrisa con carillas',      (NOW() - INTERVAL '15 days')::date, 'completado', 220000.00, 'Diseño digital aprobado por paciente.'),
  (8, '2f3b185a-bc76-437b-9088-3f63759144dc', 'Carillas anteriores x4',              (NOW() - INTERVAL '45 days')::date, 'completado', 140000.00, 'Piezas 12, 11, 21, 22.'),
  (1, '2f3b185a-bc76-437b-9088-3f63759144dc', 'Implante pieza 36',                   (NOW() - INTERVAL '30 days')::date, 'completado',  95000.00, 'Osteointegración exitosa. Control en 3 meses.'),
  (9, '2f3b185a-bc76-437b-9088-3f63759144dc', 'Consulta inicial estética',           (NOW() - INTERVAL '5 days')::date,  'planificado', 15000.00, 'Presupuesto enviado. Esperando confirmación.'),
  (1, 'c457e4f8-876c-46ed-a3ca-489789426cc6', 'Consulta y plan de tratamiento',      (NOW() - INTERVAL '90 days')::date, 'completado',      0.00, 'Consulta sin cargo. Derivado a especialistas.'),
  (5, 'c457e4f8-876c-46ed-a3ca-489789426cc6', 'Evaluación para implante molar',      (NOW() - INTERVAL '10 days')::date, 'planificado', 20000.00, 'Requiere extracción previa. Presupuesto enviado.');


-- ─── 6. INTERACCIONES ────────────────────────────────────────
INSERT INTO interacciones (paciente_id, tipo, contenido) VALUES
  (1, 'turno',      'Turno confirmado — implante pieza 36'),
  (1, 'mensaje_wa', 'Paciente confirmó asistencia por WhatsApp'),
  (2, 'chat',       'Consultó por precio de ortodoncia invisible'),
  (3, 'llamada',    'Llamó para adelantar el turno. Sin disponibilidad hasta el jueves.'),
  (3, 'nota',       'Interesada en blanqueamiento post-ortodoncia. Mencionarlo en próxima visita.'),
  (5, 'mensaje_wa', 'Se envió mensaje de seguimiento. Sin respuesta.'),
  (7, 'turno',      'Diseño de sonrisa realizado. Muy conforme con el resultado.'),
  (8, 'turno',      'Carillas colocadas. Sin inconvenientes.'),
  (9, 'chat',       'Consultó por carillas. Se agendó consulta inicial.'),
  (9, 'nota',       'Alergia a aspirina. Confirmar antes del tratamiento.');


-- ─── 7. SESIONES AGENTE ──────────────────────────────────────
INSERT INTO sesiones_agente (session_id, paciente_id) VALUES
  ('sess_abc123def456', 2),
  ('sess_xyz789uvw012', NULL),
  ('sess_mno345pqr678', 5),
  ('sess_qrs456tuv789', 9);


-- ─── 8. MENSAJES AGENTE ──────────────────────────────────────
INSERT INTO mensajes_agente (sesion_id, rol, contenido, es_bot) VALUES
  (1, 'user',  'Hola, quiero saber cuánto sale la ortodoncia', false),
  (1, 'model', 'Hola! Ofrecemos ortodoncia metálica y estética. Lo mejor es agendar una consulta sin cargo. ¿Querés que te reserve un turno?', true),
  (1, 'user',  'Sí, ¿tienen disponibilidad esta semana?', false),
  (1, 'model', '¡Sí! Tenemos turnos disponibles a partir de mañana. Reservá en solucionesdentales.com/turnos o decime tu nombre y te ayudo ahora.', true),
  (2, 'user',  'Tengo un dolor fuerte en una muela', false),
  (2, 'model', 'Entiendo, los dolores dentales son urgentes. Tenemos turnos de urgencia disponibles hoy. ¿Podés venir?', true),
  (4, 'user',  'Quiero información sobre carillas dentales', false),
  (4, 'model', 'Las carillas de porcelana son nuestra especialidad. La Dra. García hace diseños increíbles. ¿Agendamos una consulta sin cargo?', true),
  (4, 'user',  'Sí, me interesa', false),
  (4, 'model', 'Perfecto! Reservá en solucionesdentales.com/turnos eligiendo Estética dental. La consulta inicial no tiene costo.', true);


-- ─── 9. GALERÍA DE CASOS ─────────────────────────────────────
INSERT INTO casos_galeria (tipo_tratamiento, descripcion, imagen_antes_url, imagen_despues_url, duracion_tratamiento, aprobado) VALUES
  ('blanqueamiento', 'Blanqueamiento LED — manchas por café',
   'https://xxx.supabase.co/storage/v1/object/public/casos/blanc_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/blanc_despues_01.jpg',
   '1 sesión · 90 min', true),
  ('estetica', 'Diseño de sonrisa — 6 carillas de porcelana',
   'https://xxx.supabase.co/storage/v1/object/public/casos/car_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/car_despues_01.jpg',
   '2 sesiones · 3 semanas', true),
  ('estetica', 'Carillas anteriores x4 — corrección de forma y color',
   'https://xxx.supabase.co/storage/v1/object/public/casos/car_antes_02.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/car_despues_02.jpg',
   '2 sesiones · 2 semanas', true),
  ('ortodoncia', 'Corrección de apiñamiento dental severo',
   'https://xxx.supabase.co/storage/v1/object/public/casos/orto_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/orto_despues_01.jpg',
   '18 meses', true),
  ('implante', 'Implante molar inferior — restauración completa',
   'https://xxx.supabase.co/storage/v1/object/public/casos/imp_antes_01.jpg',
   'https://xxx.supabase.co/storage/v1/object/public/casos/imp_despues_01.jpg',
   '3 meses', false);


-- ─── 10. ALARMAS ─────────────────────────────────────────────
INSERT INTO alarmas (tipo, paciente_id, titulo, descripcion, prioridad, resuelta) VALUES
  ('nuevo_turno',        4, 'Nuevo turno — Roberto Silva',         'estetica · pendiente de confirmación',                       'alta',  false),
  ('nuevo_turno',        9, 'Nuevo turno — Florencia Aguirre',     'estetica · consulta inicial confirmada',                     'alta',  false),
  ('paciente_sin_turno', 5, 'Valentina Torres sin respuesta',      'No respondió el mensaje de seguimiento enviado hace 3 días', 'media', false),
  ('recordatorio',       1, 'Control post-implante — María G.',    'Implante hace 30 días. Programar control de osteointegración.','media', false),
  ('recordatorio',       3, 'Fin tratamiento — Laura Fernández',   'Carillas completadas. Ofrecer mantenimiento semestral.',      'baja',  false),
  ('presupuesto',        9, 'Presupuesto pendiente — Florencia A.','Esperando confirmación de presupuesto de carillas.',          'media', false);


-- ─── 11. CONFIG IA ───────────────────────────────────────────
UPDATE config_ia SET valor = '5491123456789' WHERE clave = 'wa_numero';
-- Formato: 549 + código de área sin 0 + número sin 15  →  Ej CABA: 5491134567890
