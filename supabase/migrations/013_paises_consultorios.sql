-- Migration: 013_paises_consultorios.sql
-- M13 Fase 2: tablas base de multi-país y consultorios.
--
-- Estrategia: aditiva. NO toca tablas existentes (eso lo hace 014).
-- Crea las entidades nuevas + seeds.

-- ── 1. paises ────────────────────────────────────────────────────────────────
-- Catálogo de países soportados con sus reglas de compliance.
CREATE TABLE paises (
  codigo CHAR(2) PRIMARY KEY,                           -- 'AR', 'BO', 'US'
  nombre TEXT NOT NULL,
  idioma_default TEXT NOT NULL,                          -- 'es', 'en', 'pt-BR'
  moneda CHAR(3) NOT NULL,                               -- 'ARS', 'BOB', 'USD', 'BRL'
  timezone_default TEXT NOT NULL,                        -- 'America/Argentina/Buenos_Aires', etc
  ley_referencia TEXT,
  autoridad TEXT,
  nivel_seguridad TEXT NOT NULL DEFAULT 'medio'
    CHECK (nivel_seguridad IN ('basico', 'medio', 'critico')),
  requiere_baa BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_audit_log BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_consentimiento_explicito BOOLEAN NOT NULL DEFAULT TRUE,
  retencion_datos_dias INTEGER NOT NULL DEFAULT 1825,    -- 5 años default
  requiere_firma_receta BOOLEAN NOT NULL DEFAULT FALSE,
  notif_brecha_horas INTEGER,                            -- NULL si no aplica
  modelo_ia_default TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE paises IS 'Catálogo de países soportados con flags de compliance';
COMMENT ON COLUMN paises.nivel_seguridad IS 'Determina políticas RLS y profundidad de encriptación';
COMMENT ON COLUMN paises.requiere_baa IS 'HIPAA US: requiere Business Associate Agreement con vendors';
COMMENT ON COLUMN paises.modelo_ia_default IS 'Para US usar Claude vía AWS Bedrock con BAA';

-- Seeds: AR, BO, US
INSERT INTO paises (
  codigo, nombre, idioma_default, moneda, timezone_default,
  ley_referencia, autoridad, nivel_seguridad,
  requiere_baa, requiere_audit_log, requiere_consentimiento_explicito,
  retencion_datos_dias, requiere_firma_receta, notif_brecha_horas,
  modelo_ia_default
) VALUES
  ('AR', 'Argentina', 'es', 'ARS', 'America/Argentina/Buenos_Aires',
   'Ley 25.326 + Disposición 11/2006 AAIP', 'AAIP', 'critico',
   FALSE, FALSE, TRUE,
   1825, TRUE, NULL,
   'gemini-2.0-flash'),

  ('BO', 'Bolivia', 'es', 'BOB', 'America/La_Paz',
   'Constitución Art. 21/130 + DS 1391/2012', 'AGETIC', 'medio',
   FALSE, FALSE, TRUE,
   1825, FALSE, NULL,
   'gemini-2.0-flash'),

  ('US', 'United States', 'en', 'USD', 'America/New_York',
   'HIPAA + HITECH Act + state laws', 'HHS Office for Civil Rights', 'critico',
   TRUE, TRUE, TRUE,
   2190, FALSE, 72,
   'claude-sonnet-4-6');


-- ── 2. consultorios ─────────────────────────────────────────────────────────
-- Multi-tenant: cada cliente del SaaS es un consultorio.
CREATE TABLE consultorios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  pais_codigo CHAR(2) NOT NULL REFERENCES paises(codigo),
  -- Datos del establecimiento
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  wa_numero TEXT,                                        -- WhatsApp del consultorio
  -- Identificación fiscal/profesional (varía por país)
  identificacion_fiscal TEXT,                            -- CUIT (AR), NIT (BO), EIN (US)
  matricula_titular TEXT,                                -- Matrícula del odontólogo titular
  odontologo_titular_id UUID REFERENCES usuarios(id),
  -- Estado de compliance
  estado_compliance TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (estado_compliance IN ('onboarding', 'docs_pendientes', 'en_revision', 'verificado', 'suspendido')),
  fecha_verificacion TIMESTAMP WITH TIME ZONE,
  -- Configuración
  idioma_override TEXT,                                  -- Si NULL usa idioma_default del país
  timezone_override TEXT,
  -- Soft delete
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consultorios_pais ON consultorios(pais_codigo);
CREATE INDEX idx_consultorios_estado ON consultorios(estado_compliance);

COMMENT ON TABLE consultorios IS 'Multi-tenant: cada cliente del SaaS es un consultorio';
COMMENT ON COLUMN consultorios.idioma_override IS 'Si NULL toma paises.idioma_default';

-- Crear consultorio default para datos pre-multi-tenant (id=1, AR)
INSERT INTO consultorios (
  id, nombre, pais_codigo, estado_compliance, fecha_verificacion, activo
) VALUES (
  1, 'Soluciones Dentales (default)', 'AR', 'verificado', NOW(), TRUE
);

-- Reset de la sequence para que próximos INSERT empiecen desde 2
SELECT setval('consultorios_id_seq', 1, true);


-- ── 3. documentos_requeridos_pais ───────────────────────────────────────────
-- Catálogo: qué docs pide cada país para habilitar un consultorio.
CREATE TABLE documentos_requeridos_pais (
  id SERIAL PRIMARY KEY,
  pais_codigo CHAR(2) NOT NULL REFERENCES paises(codigo),
  tipo_documento TEXT NOT NULL,                          -- 'matricula_colegio', 'nit', 'npi', etc
  nombre_display_es TEXT NOT NULL,
  nombre_display_en TEXT,
  nombre_display_pt TEXT,
  descripcion_es TEXT,
  descripcion_en TEXT,
  descripcion_pt TEXT,
  obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  link_tramite TEXT,
  vencimiento_meses INTEGER,                             -- NULL si no vence
  orden INTEGER DEFAULT 100,                             -- Orden de presentación en wizard
  UNIQUE (pais_codigo, tipo_documento)
);

CREATE INDEX idx_docs_req_pais ON documentos_requeridos_pais(pais_codigo, orden);

-- Seeds: docs requeridos por país
INSERT INTO documentos_requeridos_pais
  (pais_codigo, tipo_documento, nombre_display_es, nombre_display_en, nombre_display_pt,
   descripcion_es, obligatorio, vencimiento_meses, orden)
VALUES
  -- AR (5 docs)
  ('AR', 'matricula_colegio_odontologico', 'Matrícula Colegio Odontológico', 'Dental College License', 'Matrícula do Colégio Odontológico',
   'Matrícula vigente del odontólogo titular en el Colegio de la jurisdicción (CABA, PBA, etc)', TRUE, 12, 10),
  ('AR', 'habilitacion_municipal', 'Habilitación Municipal', 'Municipal License', 'Habilitação Municipal',
   'Habilitación del municipio donde funciona el consultorio', TRUE, 24, 20),
  ('AR', 'inscripcion_afip_cuit', 'CUIT (AFIP)', 'Tax ID (AFIP)', 'CNPJ (AFIP)',
   'Constancia de inscripción en AFIP', TRUE, NULL, 30),
  ('AR', 'inscripcion_aaip_base_datos', 'Inscripción AAIP', 'AAIP Database Registration', 'Registro AAIP',
   'Inscripción de la base de datos en AAIP (Ley 25.326)', TRUE, 12, 40),
  ('AR', 'politica_privacidad_url', 'Política de Privacidad', 'Privacy Policy', 'Política de Privacidade',
   'URL pública con la política de privacidad publicada', TRUE, NULL, 50),

  -- BO (6 docs)
  ('BO', 'nit_impuestos', 'NIT (Impuestos)', 'Tax ID (NIT)', 'CNPJ (NIT)',
   'Número de Identificación Tributaria del Servicio de Impuestos Nacionales', TRUE, NULL, 10),
  ('BO', 'matricula_colegio_odontologos_bolivia', 'Matrícula CDB', 'Bolivia Dental College License', 'Matrícula CDB',
   'Matrícula vigente del Colegio de Odontólogos de Bolivia (nacional + departamental)', TRUE, 12, 20),
  ('BO', 'autorizacion_sedes', 'Autorización SEDES', 'SEDES Authorization', 'Autorização SEDES',
   'Autorización del Servicio Departamental de Salud (categoría I/II/III)', TRUE, 12, 30),
  ('BO', 'licencia_municipal', 'Licencia Municipal', 'Municipal License', 'Licença Municipal',
   'Licencia de funcionamiento de la alcaldía local', TRUE, 12, 40),
  ('BO', 'registro_sanitario_establecimiento', 'Registro Sanitario', 'Sanitary Registry', 'Registro Sanitário',
   'Registro sanitario del establecimiento (Ministerio de Salud)', TRUE, 24, 50),
  ('BO', 'certificado_bioseguridad', 'Certificado Bioseguridad', 'Biosafety Certificate', 'Certificado Biossegurança',
   'Certificado de fumigación + bioseguridad', TRUE, 12, 60),

  -- US (9 docs - HIPAA estricto)
  ('US', 'state_dental_license', 'State Dental License', 'State Dental License', 'State Dental License',
   'Active dental license in the state of practice', TRUE, 24, 10),
  ('US', 'npi_number', 'NPI Number', 'NPI Number', 'NPI Number',
   'National Provider Identifier number', TRUE, NULL, 20),
  ('US', 'state_business_registration', 'State Business Registration', 'State Business Registration', 'State Business Registration',
   'Business registration in the state', TRUE, 12, 30),
  ('US', 'malpractice_insurance', 'Malpractice Insurance', 'Malpractice Insurance', 'Malpractice Insurance',
   'Active malpractice insurance certificate', TRUE, 12, 40),
  ('US', 'hipaa_risk_assessment', 'HIPAA Risk Assessment', 'HIPAA Risk Assessment', 'HIPAA Risk Assessment',
   'Annual HIPAA Security Rule risk assessment', TRUE, 12, 50),
  ('US', 'baa_signed_supabase', 'BAA Supabase', 'BAA Supabase', 'BAA Supabase',
   'Signed Business Associate Agreement with Supabase', TRUE, NULL, 60),
  ('US', 'baa_signed_vercel', 'BAA Vercel', 'BAA Vercel', 'BAA Vercel',
   'Signed Business Associate Agreement with Vercel', TRUE, NULL, 70),
  ('US', 'privacy_notice_published', 'Notice of Privacy Practices', 'Notice of Privacy Practices', 'Notice of Privacy Practices',
   'Published Notice of Privacy Practices (HIPAA Privacy Rule)', TRUE, NULL, 80),
  ('US', 'breach_notification_procedure', 'Breach Notification Procedure', 'Breach Notification Procedure', 'Breach Notification Procedure',
   'Documented procedure for breach notification (72hs to HHS)', TRUE, NULL, 90);


-- ── 4. documentos_consultorio ───────────────────────────────────────────────
-- Documentos efectivamente subidos por cada consultorio.
CREATE TABLE documentos_consultorio (
  id SERIAL PRIMARY KEY,
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,                          -- match con documentos_requeridos_pais.tipo_documento
  archivo_url TEXT NOT NULL,                             -- Supabase Storage URL
  fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_vencimiento DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente_revision'
    CHECK (estado IN ('pendiente_revision', 'aprobado', 'rechazado', 'vencido')),
  observaciones TEXT,
  revisado_por UUID REFERENCES usuarios(id),
  revisado_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (consultorio_id, tipo_documento)
);

CREATE INDEX idx_docs_consultorio ON documentos_consultorio(consultorio_id, estado);


-- ── 5. audit_log ────────────────────────────────────────────────────────────
-- Universal audit log. Obligatorio para US/HIPAA, útil para todos.
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  consultorio_id INTEGER REFERENCES consultorios(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  paciente_id INTEGER,                                   -- FK lógico, sin restricción para evitar bloqueo en deletes
  accion TEXT NOT NULL,                                  -- 'view_historial', 'edit_turno', 'download_receta', etc
  recurso_tipo TEXT,                                     -- 'paciente', 'turno', 'historial_clinico', etc
  recurso_id TEXT,                                       -- ID del recurso afectado (puede ser INT o UUID)
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,                                        -- detalles libres
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_consultorio_fecha ON audit_log(consultorio_id, created_at DESC);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id, created_at DESC);
CREATE INDEX idx_audit_paciente ON audit_log(paciente_id, created_at DESC) WHERE paciente_id IS NOT NULL;
CREATE INDEX idx_audit_accion ON audit_log(accion);


-- ── 6. consentimientos ──────────────────────────────────────────────────────
-- Consentimientos firmados por pacientes (PDPA AR, LGPD BR, HIPAA US).
CREATE TABLE consentimientos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL,                          -- FK lógico
  consultorio_id INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('tratamiento_datos', 'telemedicina', 'marketing', 'historia_clinica')),
  version_texto TEXT NOT NULL,                           -- snapshot del texto al momento de firmar
  firmado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  revocado_at TIMESTAMP WITH TIME ZONE                   -- Si paciente revocó (derecho ARCO)
);

CREATE INDEX idx_consentimientos_paciente ON consentimientos(paciente_id, tipo);


-- ── 7. RLS placeholders (se completan en Fase 3) ────────────────────────────
-- Activamos RLS pero sin policies aún → solo service_role accede.
-- Las policies multi-tenant van en migración 015 cuando esté el middleware.
ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_requeridos_pais ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_consultorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentimientos ENABLE ROW LEVEL SECURITY;

-- paises es lectura pública (catálogo)
ALTER TABLE paises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paises lectura pública" ON paises FOR SELECT USING (true);


-- ── 8. Updated_at triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consultorios_updated_at
  BEFORE UPDATE ON consultorios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
