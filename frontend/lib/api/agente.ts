import { tenantHeaders } from './tenant'

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
    headers: { 'Content-Type': 'application/json', ...tenantHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al contactar al agente')
  }
  return res.json()
}

export async function analizarFoto(
  imagen: File,
  opts: { session_id: string; mensaje?: string; paciente_id?: number | null },
): Promise<MensajeResponse> {
  const fd = new FormData()
  fd.append('session_id', opts.session_id)
  if (opts.mensaje) fd.append('mensaje', opts.mensaje)
  if (opts.paciente_id != null) fd.append('paciente_id', String(opts.paciente_id))
  fd.append('imagen', imagen)
  const res = await fetch(`${API_URL}/agente/diagnostico-foto`, {
    method: 'POST',
    headers: tenantHeaders(),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error analizando foto')
  }
  return res.json()
}

/** Versión streaming: invoca onChunk por cada trozo recibido y resuelve cuando termina.
 * Si el navegador no soporta ReadableStream o falla la conexión, hace fallback a enviarMensaje(). */
export async function enviarMensajeStream(
  payload: MensajePayload,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const res = await fetch(`${API_URL}/agente/mensaje-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tenantHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok || !res.body) {
    // Fallback al endpoint bloqueante
    const r = await enviarMensaje(payload)
    onChunk(r.respuesta)
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    if (text) onChunk(text)
  }
}
