// Proxy server-side → Next.js reenvía a la VPS sin mixed-content
import { tenantHeaders } from './tenant'

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
  telefono?: string
  fecha_hora: string
  tipo_tratamiento: string
  notas?: string
  email?: string
  usuario_id?: string
  consentimiento_aceptado?: boolean
  consentimiento_version_texto?: string
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
    { cache: 'no-store', headers: tenantHeaders() },
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
    { cache: 'no-store', headers: tenantHeaders() },
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
    headers: { 'Content-Type': 'application/json', ...tenantHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al solicitar el turno')
  }
  return res.json()
}
