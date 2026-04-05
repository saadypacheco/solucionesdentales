const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

export interface SlotsResponse {
  fecha: string
  tratamiento: string
  duracion_minutos: number
  slots: string[]
  mensaje?: string
}

export interface SolicitarTurnoPayload {
  nombre: string
  telefono: string
  fecha_hora: string   // ISO 8601
  tipo_tratamiento: string
  notas?: string
}

export interface TurnoResponse {
  turno_id: number
  paciente_id: number
  estado: string
  duracion_minutos: number
}

export async function getSlots(fecha: string, tratamiento: string): Promise<SlotsResponse> {
  const res = await fetch(
    `${API_URL}/turnos/disponibles?fecha=${fecha}&tratamiento=${tratamiento}`,
    { cache: 'no-store' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al obtener disponibilidad')
  }
  return res.json()
}

export async function solicitarTurno(payload: SolicitarTurnoPayload): Promise<TurnoResponse> {
  const res = await fetch(`${API_URL}/turnos/`, {
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
