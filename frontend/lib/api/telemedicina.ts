import { tenantHeaders } from './tenant'

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
    throw new Error((err as { detail?: string }).detail ?? `Error ${res.status}`)
  }
  return res.json()
}

/* ─── Tipos ─── */
export interface OdontologoVirtual {
  id: string
  nombre: string
  especialidades: string[]
  precio_primera_consulta: number
  precio_seguimiento: number
  moneda: string
}

export interface PrecioInfo {
  precio: number
  moneda: string
  qr_pago_url: string | null
  datos_transferencia: string | null
}

export interface CrearTurnoVirtualPayload {
  nombre: string
  telefono?: string
  email?: string
  fecha_hora: string
  odontologo_id: string
  es_primera_consulta: boolean
  notas?: string
  consentimiento_aceptado: boolean
}

export interface TurnoVirtualResponse {
  turno_id: number
  paciente_id: number
  estado: string
  estado_pago: string
  precio: number
  moneda: string
  qr_pago_url: string | null
  datos_transferencia: string | null
}

export interface SalaInfo {
  turno_id: number
  fecha_hora: string
  url: string
  room_name: string
  password: string
}

export interface PrecioConfig {
  id: number
  consultorio_id: number
  odontologo_id: string
  precio_primera_consulta: number
  precio_seguimiento: number
  moneda: string
  qr_pago_url: string | null
  datos_transferencia: string | null
  activo: boolean
  usuarios?: { id: string; nombre: string }
}

/* ─── Públicos ─── */
export async function getOdontologosVirtual(): Promise<OdontologoVirtual[]> {
  const res = await fetch(`${API_URL}/telemedicina/odontologos-virtual`, {
    cache: 'no-store',
    headers: tenantHeaders(),
  })
  if (!res.ok) throw new Error('Error cargando odontólogos')
  return res.json()
}

export async function getPrecio(odontologoId: string, esPrimera: boolean): Promise<PrecioInfo> {
  const res = await fetch(
    `${API_URL}/telemedicina/precio?odontologo_id=${odontologoId}&es_primera_consulta=${esPrimera}`,
    { cache: 'no-store', headers: tenantHeaders() },
  )
  if (!res.ok) throw new Error('Error cargando precio')
  return res.json()
}

export async function crearTurnoVirtual(payload: CrearTurnoVirtualPayload): Promise<TurnoVirtualResponse> {
  const res = await fetch(`${API_URL}/telemedicina/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tenantHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al crear turno virtual')
  }
  return res.json()
}

export async function subirComprobante(turnoId: number, archivo: File): Promise<{ ok: boolean; estado_pago: string }> {
  const fd = new FormData()
  fd.append('archivo', archivo)
  const res = await fetch(`${API_URL}/telemedicina/turnos/${turnoId}/comprobante`, {
    method: 'POST',
    headers: tenantHeaders(),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al subir comprobante')
  }
  return res.json()
}

/* ─── Paciente con JWT OTP ─── */
export async function getSala(token: string, turnoId: number): Promise<SalaInfo> {
  return apiFetch(`/telemedicina/turnos/${turnoId}/sala`, token)
}

/* ─── Admin ─── */
export async function getPagosPendientes(token: string) {
  return apiFetch('/telemedicina/admin/pagos-pendientes', token)
}

export async function verificarPago(
  token: string,
  turnoId: number,
  aprobado: boolean,
  motivoRechazo?: string,
): Promise<{ ok: boolean; estado_pago: string }> {
  return apiFetch(`/telemedicina/admin/turnos/${turnoId}/verificar-pago`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aprobado, motivo_rechazo: motivoRechazo }),
  })
}

export async function getPrecios(token: string): Promise<PrecioConfig[]> {
  return apiFetch('/telemedicina/admin/precios', token)
}

export async function upsertPrecio(token: string, data: {
  odontologo_id: string
  precio_primera_consulta: number
  precio_seguimiento: number
  moneda: string
  qr_pago_url?: string
  datos_transferencia?: string
}): Promise<PrecioConfig> {
  return apiFetch('/telemedicina/admin/precios', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
