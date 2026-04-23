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

export interface HorarioDoctor {
  id?: number
  usuario_id?: string
  consultorio_id?: number
  dia_semana: number  // 0=lun ... 6=dom
  hora_inicio: string  // "HH:MM" o "HH:MM:SS"
  hora_fin: string
  activo: boolean
}

export async function getHorariosDoctor(token: string, doctorId: string): Promise<HorarioDoctor[]> {
  return apiFetch(`/horarios/${doctorId}`, token)
}

export async function reemplazarHorariosDoctor(
  token: string,
  doctorId: string,
  horarios: HorarioDoctor[],
): Promise<{ ok: boolean; total: number }> {
  return apiFetch(`/horarios/${doctorId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ horarios }),
  })
}
