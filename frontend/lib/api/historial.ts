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

export interface Historial {
  id?: number
  paciente_id: number
  consultorio_id?: number
  alergias: string[]
  medicacion: string[]
  antecedentes: string | null
  created_at?: string
  updated_at?: string
}

/* ─── Admin ─── */
export async function getHistorialAdmin(token: string, pacienteId: number): Promise<Historial> {
  return apiFetch(`/historial/admin/${pacienteId}`, token)
}

export async function upsertHistorial(token: string, pacienteId: number, data: {
  alergias?: string[]
  medicacion?: string[]
  antecedentes?: string | null
}): Promise<Historial> {
  return apiFetch(`/historial/admin/${pacienteId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/* ─── Paciente OTP ─── */
export async function getMiHistorial(token: string): Promise<Historial> {
  return apiFetch('/historial/paciente', token)
}
