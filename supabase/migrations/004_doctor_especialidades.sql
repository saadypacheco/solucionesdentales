-- Migration: 004_doctor_especialidades.sql
-- Agrega especialidades a odontólogos para filtrar disponibilidad por tratamiento

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS especialidades TEXT[] DEFAULT '{}';

COMMENT ON COLUMN usuarios.especialidades IS
  'Tratamientos que atiende este odontólogo. Array vacío = atiende todos los tratamientos.';

-- Ejemplo de cómo asignar especialidades a un odontólogo existente:
-- UPDATE usuarios SET especialidades = '{limpieza,ortodoncia}' WHERE id = '<uuid>';
-- Un admin con array vacío es visible en todos los tratamientos.
