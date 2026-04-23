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

export interface Notificacion {
  id: number
  consultorio_id: number
  usuario_id: string | null
  paciente_id: number | null
  tipo: string
  titulo: string
  mensaje: string | null
  link: string | null
  metadata: Record<string, unknown> | null
  leida: boolean
  leida_at: string | null
  prioridad: 'baja' | 'normal' | 'alta' | 'critica'
  created_at: string
}

/* ─── Staff ─── */
export async function listarNotifsStaff(
  token: string,
  opts: { soloNoLeidas?: boolean; limit?: number } = {},
): Promise<Notificacion[]> {
  const params = new URLSearchParams()
  if (opts.soloNoLeidas) params.set('solo_no_leidas', 'true')
  if (opts.limit) params.set('limit', String(opts.limit))
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/notificaciones/staff${qs}`, token)
}

export async function countNoLeidasStaff(token: string): Promise<{ no_leidas: number }> {
  return apiFetch('/notificaciones/staff/count', token)
}

export async function marcarLeidaStaff(token: string, id: number): Promise<Notificacion> {
  return apiFetch(`/notificaciones/staff/${id}/leida`, token, { method: 'PATCH' })
}

export async function marcarTodasLeidasStaff(token: string): Promise<{ marcadas: number }> {
  return apiFetch('/notificaciones/staff/marcar-todas-leidas', token, { method: 'PATCH' })
}

/* ─── Paciente (JWT OTP) ─── */
export async function listarNotifsPaciente(
  token: string,
  opts: { soloNoLeidas?: boolean; limit?: number } = {},
): Promise<Notificacion[]> {
  const params = new URLSearchParams()
  if (opts.soloNoLeidas) params.set('solo_no_leidas', 'true')
  if (opts.limit) params.set('limit', String(opts.limit))
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/notificaciones/paciente${qs}`, token)
}

export async function marcarLeidaPaciente(token: string, id: number): Promise<Notificacion> {
  return apiFetch(`/notificaciones/paciente/${id}/leida`, token, { method: 'PATCH' })
}
