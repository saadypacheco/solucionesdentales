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

export type TipoRadiografia = 'panoramica' | 'periapical' | 'bitewing' | 'lateral' | 'cefalometrica' | 'otra'

export interface Radiografia {
  id: number
  paciente_id: number
  consultorio_id: number
  archivo_url: string
  tipo: TipoRadiografia
  fecha_toma: string | null
  notas: string | null
  uploaded_by: string | null
  activa: boolean
  created_at: string
  usuarios?: { id: string; nombre: string } | null
}

export async function listarRadiografias(token: string, pacienteId: number): Promise<Radiografia[]> {
  return apiFetch(`/radiografias/admin?paciente_id=${pacienteId}`, token)
}

export async function subirRadiografia(
  token: string,
  data: { paciente_id: number; tipo: TipoRadiografia; fecha_toma?: string; notas?: string; archivo: File },
): Promise<Radiografia> {
  const fd = new FormData()
  fd.append('paciente_id', String(data.paciente_id))
  fd.append('tipo', data.tipo)
  if (data.fecha_toma) fd.append('fecha_toma', data.fecha_toma)
  if (data.notas) fd.append('notas', data.notas)
  fd.append('archivo', data.archivo)

  const res = await fetch(`${API_URL}/radiografias/admin`, {
    method: 'POST',
    headers: authHeaders(token),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al subir')
  }
  return res.json()
}

export async function eliminarRadiografia(token: string, id: number): Promise<void> {
  await apiFetch(`/radiografias/admin/${id}`, token, { method: 'DELETE' })
}

export async function misRadiografias(token: string): Promise<Radiografia[]> {
  return apiFetch('/radiografias/paciente', token)
}
