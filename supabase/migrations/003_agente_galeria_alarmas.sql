-- Migration: 003_agente_galeria_alarmas.sql
-- Agente IA, galería de casos, alarmas, config IA

-- Sesiones del agente (anónimas o vinculadas a paciente)
CREATE TABLE sesiones_agente (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sesiones_session_id ON sesiones_agente(session_id);

ALTER TABLE sesiones_agente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Público puede insertar sesiones" ON sesiones_agente FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Staff ve sesiones" ON sesiones_agente FOR SELECT
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));


-- Mensajes del agente
CREATE TABLE mensajes_agente (
  id SERIAL PRIMARY KEY,
  sesion_id INTEGER NOT NULL REFERENCES sesiones_agente(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('user','model')),
  contenido TEXT NOT NULL,
  es_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mensajes_sesion ON mensajes_agente(sesion_id);

ALTER TABLE mensajes_agente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Público puede insertar mensajes" ON mensajes_agente FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Público puede leer mensajes de su sesión" ON mensajes_agente FOR SELECT USING (TRUE);


-- Galería de casos (antes/después)
CREATE TABLE casos_galeria (
  id SERIAL PRIMARY KEY,
  tipo_tratamiento TEXT NOT NULL,
  descripcion TEXT,
  imagen_antes_url TEXT,
  imagen_despues_url TEXT,
  duracion_tratamiento TEXT,
  aprobado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE casos_galeria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Público ve casos aprobados" ON casos_galeria FOR SELECT USING (aprobado = TRUE);
CREATE POLICY "Staff gestiona galería" ON casos_galeria FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));


-- Alarmas internas
CREATE TABLE alarmas (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('alta','media','baja')),
  resuelta BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alarmas_resuelta ON alarmas(resuelta);
CREATE INDEX idx_alarmas_prioridad ON alarmas(prioridad);

ALTER TABLE alarmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff gestiona alarmas" ON alarmas FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));


-- Configuración IA (editable desde admin)
CREATE TABLE config_ia (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE config_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo admin edita config IA" ON config_ia FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin');

-- Valores por defecto
INSERT INTO config_ia (clave, valor) VALUES
  ('wa_numero', '5491100000000'),
  ('horario_atencion', 'Lunes a viernes 9 a 18hs, sábados 9 a 13hs'),
  ('mensaje_recordatorio', 'Hola {nombre}! Te recordamos tu turno mañana a las {hora}. Respondé SI para confirmar o NO para cancelar.');


-- Storage bucket para imágenes
INSERT INTO storage.buckets (id, name, public) VALUES ('casos', 'casos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('tratamientos', 'tratamientos', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Público ve imágenes de casos" ON storage.objects FOR SELECT
  USING (bucket_id = 'casos');
CREATE POLICY "Staff sube imágenes de casos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'casos' AND (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));
CREATE POLICY "Staff gestiona imágenes de tratamientos" ON storage.objects FOR ALL
  USING (bucket_id = 'tratamientos' AND (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo'));
