-- Migration: 008_paciente_otps.sql
-- Tabla para códigos OTP de verificación de pacientes

CREATE TABLE paciente_otps (
  id SERIAL PRIMARY KEY,
  telefono TEXT NOT NULL,
  codigo TEXT NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otps_telefono ON paciente_otps(telefono);

ALTER TABLE paciente_otps ENABLE ROW LEVEL SECURITY;
-- Solo el backend (service_role) puede leer/escribir OTPs
-- No hace falta policy pública — el backend bypasea RLS con service_role
