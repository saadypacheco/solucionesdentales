const API_URL = '/api/proxy'

export interface MensajePayload {
  session_id: string
  mensaje: string
  paciente_id?: number | null
}

export interface MensajeResponse {
  respuesta: string
  sesion_id: number
}

export async function enviarMensaje(payload: MensajePayload): Promise<MensajeResponse> {
  const res = await fetch(`${API_URL}/agente/mensaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al contactar al agente')
  }
  return res.json()
}
