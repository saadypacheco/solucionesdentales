// Proxy server-side → Next.js reenvía a la VPS sin mixed-content
const API_URL = '/api/proxy'

export interface Doctor {
  id: string
  nombre: string
}

export interface DoctoresResponse {
  tratamiento: string
  total: number
  doctores: Doctor[]
}

export interface SlotsResponse {
  fecha: string
  tratamiento: string
  duracion_minutos: number
  usuario_id?: string
  slots: string[]
  mensaje?: string
}

export interface SolicitarTurnoPayload {
  nombre: string
  telefono?: string  // Optional if email is provided
  fecha_hora: string   // ISO 8601
  tipo_tratamiento: string
  notas?: string
  email?: string  // Email del paciente
  usuario_id?: string  // UUID del odontólogo
}

export interface TurnoResponse {
  turno_id: number
  paciente_id: number
  estado: string
  duracion_minutos: number
  usuario_id?: string
}

export async function getDoctores(tratamiento: string): Promise<DoctoresResponse> {
  const res = await fetch(
    `${API_URL}/turnos/doctores?tratamiento=${tratamiento}`,
    { cache: 'no-store' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al obtener odontólogos')
  }
  return res.json()
}

export async function getSlots(
  fecha: string,
  tratamiento: string,
  usuario_id?: string,
): Promise<SlotsResponse> {
  const params = new URLSearchParams({ fecha, tratamiento })
  if (usuario_id) params.set('usuario_id', usuario_id)
  const res = await fetch(
    `${API_URL}/turnos/disponibles?${params}`,
    { cache: 'no-store' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al obtener disponibilidad')
  }
  return res.json()
}

export async function solicitarTurno(payload: SolicitarTurnoPayload): Promise<TurnoResponse> {
  const res = await fetch(`${API_URL}/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al solicitar el turno')
  }
  return res.json()
}
