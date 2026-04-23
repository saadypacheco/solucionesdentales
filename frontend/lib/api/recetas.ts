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

export interface Receta {
  id: number
  consultorio_id: number
  turno_id: number | null
  paciente_id: number
  odontologo_id: string
  contenido: string
  pdf_url: string | null
  activa: boolean
  created_at: string
  pacientes?: { id: number; nombre: string }
  usuarios?: { id: string; nombre: string }
}

/* ─── Admin ─── */
export async function listarRecetasAdmin(token: string, pacienteId?: number): Promise<Receta[]> {
  const qs = pacienteId !== undefined ? `?paciente_id=${pacienteId}` : ''
  return apiFetch(`/recetas/admin${qs}`, token)
}

export async function crearReceta(token: string, data: { paciente_id: number; contenido: string; turno_id?: number }): Promise<Receta> {
  return apiFetch('/recetas/admin', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function archivarReceta(token: string, recetaId: number): Promise<void> {
  await apiFetch(`/recetas/admin/${recetaId}`, token, { method: 'DELETE' })
}

/* ─── Paciente OTP ─── */
export async function listarRecetasPaciente(token: string): Promise<Receta[]> {
  return apiFetch('/recetas/paciente', token)
}
