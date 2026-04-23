-- Migration: 015_fix_rol_superadmin.sql
-- Fix M13 Fase 3: el CHECK constraint de usuarios.rol no incluía 'superadmin',
-- entonces el backend lo aceptaba pero la DB lo rechazaba.

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'odontologo', 'recepcionista', 'superadmin'));

COMMENT ON COLUMN usuarios.rol IS 'admin/odontologo/recepcionista del consultorio + superadmin del SaaS (M13)';
