-- Migration: 002_crm_historial.sql
-- CRM: interacciones, historial clínico, tratamientos

CREATE TABLE interacciones (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('chat','llamada','turno','mensaje_wa','nota')),
  contenido TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interacciones_paciente ON interacciones(paciente_id);

ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff gestiona interacciones" ON interacciones FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));


CREATE TABLE historial_clinico (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  alergias TEXT[] DEFAULT '{}',
  medicacion TEXT[] DEFAULT '{}',
  antecedentes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo odontologo y admin ven historial" ON historial_clinico FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo'));


CREATE TABLE tratamientos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado TEXT DEFAULT 'planificado' CHECK (estado IN ('planificado','en_curso','completado')),
  costo DECIMAL(10,2),
  imagen_urls TEXT[] DEFAULT '{}',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tratamientos_paciente ON tratamientos(paciente_id);

ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo odontologo y admin gestionan tratamientos" ON tratamientos FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo'));
