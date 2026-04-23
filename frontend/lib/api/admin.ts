const API_URL = '/api/proxy'

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
  return res.json() as Promise<{
    access_token: string
    user: StaffUser
    consultorio: ConsultorioInfo | null
  }>
}

export async function getMe(token: string): Promise<StaffUser> {
  return apiFetch('/auth/me', token)
}

/* ─── CRUD Usuarios staff ─── */
export interface StaffUserDetailed extends StaffUser {
  activo: boolean
  especialidades?: string[]
  created_at: string
  updated_at: string
}

export async function getStaff(token: string, consultorioId?: number): Promise<StaffUserDetailed[]> {
  const qs = consultorioId !== undefined ? `?consultorio_id=${consultorioId}` : ''
  return apiFetch(`/auth/usuarios${qs}`, token)
}

export async function createStaff(
  token: string,
  data: {
    email: string
    password: string
    nombre: string
    rol: string
    especialidades?: string[]
    consultorio_id?: number  // Solo respeta si el caller es superadmin
  }
): Promise<{ ok: boolean; consultorio_id?: number }> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error creating staff')
  }
  return res.json()
}

export async function updateStaff(
  token: string,
  usuarioId: string,
  data: { nombre?: string; rol?: string; especialidades?: string[]; email?: string }
): Promise<StaffUserDetailed> {
  return apiFetch(`/auth/usuarios/${usuarioId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function resetStaffPassword(
  token: string,
  usuarioId: string,
  nuevaPassword: string
): Promise<{ ok: boolean }> {
  return apiFetch(`/auth/usuarios/${usuarioId}/password`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nueva_password: nuevaPassword }),
  })
}

export async function toggleStaff(token: string, usuarioId: string): Promise<{ activo: boolean }> {
  return apiFetch(`/auth/usuarios/${usuarioId}/toggle`, token, { method: 'PATCH' })
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

export async function patchPacienteEstado(token: string, pacienteId: number, estado: string): Promise<Paciente> {
  return apiFetch(`/admin/pacientes/${pacienteId}/estado?estado=${estado}`, token, { method: 'PATCH' })
}

/* ─── Alarmas ─── */
export async function getAlarmas(token: string): Promise<Alarma[]> {
  return apiFetch('/alarmas', token)
}

export async function resolverAlarma(token: string, alarmaId: number): Promise<void> {
  await apiFetch(`/admin/alarmas/${alarmaId}/resolver`, token, { method: 'PATCH' })
}

/* ─── Config IA ─── */
export interface ConfigIA {
  clave: string
  valor: string
  updated_at: string
}

export async function getConfigIA(token: string): Promise<ConfigIA[]> {
  return apiFetch('/admin/config-ia', token)
}

export async function patchConfigIA(token: string, clave: string, valor: string): Promise<ConfigIA> {
  return apiFetch(`/admin/config-ia/${clave}?valor=${encodeURIComponent(valor)}`, token, { method: 'PATCH' })
}

/* ─── Seguimiento ─── */
export interface SeguimientoResultado {
  ok: boolean
  alarmas_generadas: number
  detalle: {
    inactivos: number
    turnos_sin_confirmar: number
    leads_sin_seguimiento: number
    tratamientos_incompletos: number
  }
}

export async function ejecutarSeguimiento(token: string): Promise<SeguimientoResultado> {
  return apiFetch('/admin/seguimiento/ejecutar', token, { method: 'POST' })
}

/* ─── Types ─── */
export interface StaffUser {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'odontologo' | 'recepcionista' | 'superadmin'
  consultorio_id?: number | null
}

export interface ConsultorioInfo {
  id: number
  nombre: string
  pais_codigo: string
  idioma_override: string | null
  timezone_override: string | null
  paises?: {
    codigo: string
    nombre: string
    idioma_default: string
    moneda: string
    timezone_default: string
  }
}

export interface TurnoAdmin {
  id: number
  paciente_id: number
  fecha_hora: string
  tipo_tratamiento: string
  estado: string
  notas: string | null
  duracion_minutos: number
  pacientes: { id?: number; nombre: string; telefono: string } | null
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
