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

export interface MensajeChat {
  id: number
  consultorio_id: number
  paciente_id: number
  odontologo_id: string
  autor: 'paciente' | 'odontologo'
  mensaje: string
  archivo_url: string | null
  leido: boolean
  created_at: string
}

export interface ConvoStaff {
  paciente_id: number
  paciente_nombre: string
  ultimo_mensaje: string
  ultimo_autor: 'paciente' | 'odontologo'
  ultimo_at: string
  no_leidos: number
}

export interface ConvoPaciente {
  odontologo_id: string
  odontologo_nombre: string
  ultimo_mensaje: string
  ultimo_autor: 'paciente' | 'odontologo'
  ultimo_at: string
  no_leidos: number
}

/* ─── Staff ─── */
export async function listarConvosStaff(token: string): Promise<ConvoStaff[]> {
  return apiFetch('/chat/admin/conversaciones', token)
}

export async function listarMensajesStaff(token: string, pacienteId: number): Promise<MensajeChat[]> {
  return apiFetch(`/chat/admin/${pacienteId}`, token)
}

export interface UploadResult {
  archivo_url: string
  filename: string
  size: number
}

export async function enviarMensajeStaff(
  token: string,
  pacienteId: number,
  mensaje: string,
  archivoUrl?: string,
): Promise<MensajeChat> {
  return apiFetch('/chat/admin', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paciente_id: pacienteId, mensaje, archivo_url: archivoUrl }),
  })
}

export async function uploadArchivoStaff(token: string, archivo: File): Promise<UploadResult> {
  const fd = new FormData()
  fd.append('archivo', archivo)
  const res = await fetch(`${API_URL}/chat/admin/upload`, {
    method: 'POST',
    headers: authHeaders(token),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al subir archivo')
  }
  return res.json()
}

/* ─── Paciente OTP ─── */
export async function listarConvosPaciente(token: string): Promise<ConvoPaciente[]> {
  return apiFetch('/chat/paciente/conversaciones', token)
}

export async function listarMensajesPaciente(token: string, odontologoId: string): Promise<MensajeChat[]> {
  return apiFetch(`/chat/paciente/${odontologoId}`, token)
}

export async function enviarMensajePaciente(
  token: string,
  odontologoId: string,
  mensaje: string,
  archivoUrl?: string,
): Promise<MensajeChat> {
  return apiFetch('/chat/paciente', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ odontologo_id: odontologoId, mensaje, archivo_url: archivoUrl }),
  })
}

export async function uploadArchivoPaciente(token: string, archivo: File): Promise<UploadResult> {
  const fd = new FormData()
  fd.append('archivo', archivo)
  const res = await fetch(`${API_URL}/chat/paciente/upload`, {
    method: 'POST',
    headers: authHeaders(token),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al subir archivo')
  }
  return res.json()
}
