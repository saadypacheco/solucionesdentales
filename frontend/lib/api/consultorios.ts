const API_URL = '/api/proxy'

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...authHeaders(token), ...(opts?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Error ${res.status}`)
  }
  return res.json()
}

/* ─── Types ─── */
export interface Pais {
  codigo: string
  nombre: string
  idioma_default: string
  moneda: string
}

export interface ConsultorioFull {
  id: number
  nombre: string
  pais_codigo: string
  direccion: string | null
  telefono: string | null
  email: string | null
  wa_numero: string | null
  identificacion_fiscal: string | null
  matricula_titular: string | null
  odontologo_titular_id: string | null
  estado_compliance: 'onboarding' | 'docs_pendientes' | 'en_revision' | 'verificado' | 'suspendido'
  fecha_verificacion: string | null
  idioma_override: string | null
  timezone_override: string | null
  activo: boolean
  created_at: string
  updated_at: string
  paises?: {
    codigo: string
    nombre: string
    idioma_default: string
    moneda: string
    timezone_default: string
    modelo_ia_default: string
    requiere_audit_log: boolean
    requiere_consentimiento_explicito: boolean
    requiere_firma_receta: boolean
  }
}

export type EstadoDocumento =
  | 'no_subido'
  | 'pendiente_revision'
  | 'aprobado'
  | 'rechazado'
  | 'vencido'

export interface ChecklistItem {
  tipo_documento: string
  nombre_display: string
  descripcion: string | null
  obligatorio: boolean
  link_tramite: string | null
  vencimiento_meses: number | null
  estado: EstadoDocumento
  documento_id: number | null
  archivo_url: string | null
  fecha_subida: string | null
  fecha_vencimiento: string | null
  observaciones: string | null
}

export interface ChecklistResumen {
  total: number
  aprobados: number
  pendientes: number
  rechazados: number
  vencidos: number
  faltantes: number
  obligatorios_aprobados: number
  obligatorios_total: number
  completo: boolean
}

export interface Checklist {
  consultorio_id: number
  pais: string
  estado_compliance_actual: string
  items: ChecklistItem[]
  resumen: ChecklistResumen
}

export interface DocumentoConsultorio {
  id: number
  consultorio_id: number
  tipo_documento: string
  archivo_url: string
  fecha_subida: string
  fecha_vencimiento: string | null
  estado: 'pendiente_revision' | 'aprobado' | 'rechazado' | 'vencido'
  observaciones: string | null
  revisado_at: string | null
}

/* ─── Endpoints ─── */
export async function getPaises(): Promise<Pais[]> {
  const res = await fetch(`${API_URL}/consultorios/paises`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Error cargando países')
  return res.json()
}

export interface PoliticaPrivacidad {
  consultorio_id: number
  pais_codigo: string
  idioma: string
  version: string
  texto_markdown: string
}

export async function getPoliticaPrivacidad(consultorioId: number, idioma: string): Promise<PoliticaPrivacidad> {
  const res = await fetch(
    `${API_URL}/consultorios/politica-privacidad?consultorio_id=${consultorioId}&idioma=${encodeURIComponent(idioma)}`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error('Error cargando política de privacidad')
  return res.json()
}

export async function getMiConsultorio(token: string): Promise<ConsultorioFull> {
  return apiFetch('/consultorios/mi-consultorio', token)
}

export async function getMiChecklist(token: string, idioma: string = 'es'): Promise<Checklist> {
  return apiFetch(`/consultorios/mi-consultorio/checklist?idioma=${idioma}`, token)
}

export async function subirDocumento(
  token: string,
  tipoDocumento: string,
  archivo: File,
  fechaVencimiento?: string,
): Promise<DocumentoConsultorio> {
  const fd = new FormData()
  fd.append('tipo_documento', tipoDocumento)
  fd.append('archivo', archivo)
  if (fechaVencimiento) fd.append('fecha_vencimiento', fechaVencimiento)

  const res = await fetch(`${API_URL}/consultorios/mi-consultorio/documentos`, {
    method: 'POST',
    headers: authHeaders(token),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al subir')
  }
  return res.json()
}

/* ─── Onboarding (superadmin) ─── */
export interface OnboardingData {
  nombre: string
  pais_codigo: string
  direccion?: string
  telefono?: string
  email?: string
  wa_numero?: string
  identificacion_fiscal?: string
  matricula_titular?: string
  idioma_override?: string
  timezone_override?: string
}

export async function crearConsultorio(token: string, data: OnboardingData): Promise<ConsultorioFull> {
  return apiFetch('/consultorios/onboarding', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
