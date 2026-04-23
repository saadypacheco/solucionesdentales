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

export interface Tratamiento {
  id: number
  consultorio_id: number
  paciente_id: number
  usuario_id: string
  descripcion: string
  fecha: string
  estado: 'planificado' | 'en_curso' | 'completado'
  costo: number | null
  imagen_urls: string[] | null
  notas?: string | null
  created_at: string
  pacientes?: { id: number; nombre: string }
  usuarios?: { id: string; nombre: string }
}

/* ─── Admin ─── */
export async function listarTratamientosAdmin(token: string, pacienteId?: number): Promise<Tratamiento[]> {
  const qs = pacienteId !== undefined ? `?paciente_id=${pacienteId}` : ''
  return apiFetch(`/tratamientos/admin${qs}`, token)
}

export async function crearTratamiento(token: string, data: {
  paciente_id: number
  descripcion: string
  fecha: string
  estado?: string
  costo?: number
  notas?: string
}): Promise<Tratamiento> {
  return apiFetch('/tratamientos/admin', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function actualizarTratamiento(token: string, id: number, data: {
  descripcion?: string
  fecha?: string
  estado?: string
  costo?: number
  notas?: string
}): Promise<Tratamiento> {
  return apiFetch(`/tratamientos/admin/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function eliminarTratamiento(token: string, id: number): Promise<void> {
  await apiFetch(`/tratamientos/admin/${id}`, token, { method: 'DELETE' })
}

/* ─── Paciente OTP ─── */
export async function listarMisTratamientos(token: string): Promise<Tratamiento[]> {
  return apiFetch('/tratamientos/paciente', token)
}
