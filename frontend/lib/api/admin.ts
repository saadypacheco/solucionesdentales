const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...authHeaders(token), ...(opts?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Error ${res.status}`)
  }
  return res.json()
}

/* ─── Auth ─── */
export async function loginStaff(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Credenciales incorrectas')
  }
  return res.json() as Promise<{ access_token: string; user: StaffUser }>
}

export async function getMe(token: string): Promise<StaffUser> {
  return apiFetch('/auth/me', token)
}

/* ─── Turnos admin ─── */
export async function getTurnosAdmin(token: string, fecha?: string): Promise<TurnoAdmin[]> {
  const qs = fecha ? `?fecha=${fecha}` : ''
  return apiFetch(`/admin/turnos${qs}`, token)
}

export async function patchTurnoEstado(token: string, turnoId: number, estado: string): Promise<TurnoAdmin> {
  return apiFetch(`/admin/turnos/${turnoId}?estado=${estado}`, token, { method: 'PATCH' })
}

/* ─── Pacientes admin ─── */
export async function getPacientesAdmin(token: string): Promise<Paciente[]> {
  return apiFetch('/admin/pacientes', token)
}

/* ─── Alarmas ─── */
export async function getAlarmas(token: string): Promise<Alarma[]> {
  return apiFetch('/alarmas/', token)
}

export async function resolverAlarma(token: string, alarmaId: number): Promise<void> {
  await apiFetch(`/admin/alarmas/${alarmaId}/resolver`, token, { method: 'PATCH' })
}

/* ─── Types ─── */
export interface StaffUser {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'odontologo' | 'recepcionista'
}

export interface TurnoAdmin {
  id: number
  fecha_hora: string
  tipo_tratamiento: string
  estado: string
  notas: string | null
  duracion_minutos: number
  pacientes: { nombre: string; telefono: string } | null
}

export interface Paciente {
  id: number
  nombre: string
  telefono: string
  email: string | null
  score: number
  estado: string
  created_at: string
}

export interface Alarma {
  id: number
  tipo: string
  titulo: string
  descripcion: string
  prioridad: 'alta' | 'media' | 'baja'
  resuelta: boolean
  paciente_id: number | null
  created_at: string
}
