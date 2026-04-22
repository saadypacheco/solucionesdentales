import type { ConsultorioFull, DocumentoConsultorio } from './consultorios'

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
    throw new Error(err.detail ?? `Error ${res.status}`)
  }
  return res.json()
}

/* ─── Tipos ─── */
export interface AuditEntry {
  id: number
  consultorio_id: number | null
  usuario_id: string | null
  paciente_id: number | null
  accion: string
  recurso_tipo: string | null
  recurso_id: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/* ─── Consultorios ─── */
export async function listarConsultorios(
  token: string,
  filtros: { estado?: string; pais?: string } = {},
): Promise<ConsultorioFull[]> {
  const params = new URLSearchParams()
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.pais) params.set('pais', filtros.pais)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/superadmin/consultorios${qs}`, token)
}

export async function obtenerConsultorio(token: string, id: number): Promise<ConsultorioFull> {
  return apiFetch(`/superadmin/consultorios/${id}`, token)
}

export async function listarDocumentosConsultorio(token: string, id: number): Promise<DocumentoConsultorio[]> {
  return apiFetch(`/superadmin/consultorios/${id}/documentos`, token)
}

export async function revisarDocumento(
  token: string,
  documentoId: number,
  estado: 'aprobado' | 'rechazado',
  observaciones?: string,
): Promise<DocumentoConsultorio> {
  return apiFetch(`/superadmin/documentos/${documentoId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, observaciones }),
  })
}

export async function suspenderConsultorio(token: string, id: number): Promise<ConsultorioFull> {
  return apiFetch(`/superadmin/consultorios/${id}/suspender`, token, { method: 'PATCH' })
}

export async function reactivarConsultorio(
  token: string,
  id: number,
): Promise<{ consultorio_id: number; estado_compliance: string }> {
  return apiFetch(`/superadmin/consultorios/${id}/reactivar`, token, { method: 'PATCH' })
}

/* ─── Audit log ─── */
export async function listarAuditLog(
  token: string,
  filtros: { consultorio_id?: number; accion?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  const params = new URLSearchParams()
  if (filtros.consultorio_id !== undefined) params.set('consultorio_id', String(filtros.consultorio_id))
  if (filtros.accion) params.set('accion', filtros.accion)
  if (filtros.limit) params.set('limit', String(filtros.limit))
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/superadmin/audit-log${qs}`, token)
}
