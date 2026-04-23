import { tenantHeaders } from './tenant'

const API_URL = '/api/proxy'

export interface OTPEnviarResponse {
  ok: boolean
  nombre: string | null
  wa_link: string
  codigo_dev: string | null   // solo en dev
}

export interface OTPVerificarResponse {
  access_token: string
  paciente: {
    id: number
    nombre: string
    telefono: string
    estado: string
    score: number
  }
}

export interface MiTurno {
  id: number
  fecha_hora: string
  tipo_tratamiento: string
  estado: string
  duracion_minutos: number
  notas: string | null
}

export async function enviarOTP(telefono: string): Promise<OTPEnviarResponse> {
  const res = await fetch(`${API_URL}/auth/otp/enviar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tenantHeaders() },
    body: JSON.stringify({ telefono }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al enviar código')
  }
  return res.json()
}

export async function verificarOTP(telefono: string, codigo: string): Promise<OTPVerificarResponse> {
  const res = await fetch(`${API_URL}/auth/otp/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tenantHeaders() },
    body: JSON.stringify({ telefono, codigo }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Código incorrecto o expirado')
  }
  return res.json()
}

export async function getMisTurnos(token: string): Promise<MiTurno[]> {
  const res = await fetch(`${API_URL}/auth/mis-turnos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Error al cargar tus turnos')
  return res.json()
}

export async function cancelarTurno(token: string, turnoId: number): Promise<void> {
  const res = await fetch(`${API_URL}/auth/mis-turnos/${turnoId}/cancelar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'No se pudo cancelar')
  }
}

/* ─── Derechos ARCO ─── */
export async function descargarMisDatos(token: string): Promise<unknown> {
  const res = await fetch(`${API_URL}/auth/mis-datos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al descargar datos')
  }
  return res.json()
}

export async function eliminarMiCuenta(token: string): Promise<{ ok: boolean; anonimizado_at: string }> {
  const res = await fetch(`${API_URL}/auth/mi-cuenta`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al eliminar cuenta')
  }
  return res.json()
}
