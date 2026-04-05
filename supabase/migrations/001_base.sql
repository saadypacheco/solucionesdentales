-- Migration: 001_base.sql
-- Tablas base: usuarios staff, pacientes, turnos

-- Staff (login con Supabase Auth)
CREATE TABLE usuarios (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  rol TEXT DEFAULT 'recepcionista' CHECK (rol IN ('admin', 'odontologo', 'recepcionista')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff ve su propio perfil" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin ve todos" ON usuarios FOR SELECT
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin');


-- Pacientes (identificados por teléfono, sin login obligatorio)
CREATE TABLE pacientes (
  id SERIAL PRIMARY KEY,
  telefono TEXT UNIQUE NOT NULL,
  nombre TEXT,
  email TEXT,
  score INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'nuevo' CHECK (estado IN ('nuevo','contactado','interesado','turno_agendado','paciente_activo','inactivo','perdido')),
  proxima_accion TEXT,
  verificado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pacientes_telefono ON pacientes(telefono);
CREATE INDEX idx_pacientes_estado ON pacientes(estado);

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff puede ver pacientes" ON pacientes FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));


-- Turnos
CREATE TABLE turnos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion_minutos INTEGER DEFAULT 30,
  tipo_tratamiento TEXT NOT NULL,
  estado TEXT DEFAULT 'solicitado' CHECK (estado IN ('solicitado','confirmado','realizado','cancelado','ausente')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_turnos_fecha ON turnos(fecha_hora);
CREATE INDEX idx_turnos_paciente ON turnos(paciente_id);
CREATE INDEX idx_turnos_estado ON turnos(estado);

ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff gestiona turnos" ON turnos FOR ALL
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','odontologo','recepcionista'));
