const API_URL = '/api/proxy'

export interface Caso {
  id: number
  tipo_tratamiento: string
  descripcion: string
  imagen_antes_url: string
  imagen_despues_url: string
  duracion_tratamiento: string
  aprobado: boolean
  created_at: string
}

export async function getCasos(tipo?: string): Promise<Caso[]> {
  const qs = tipo ? `?tipo=${tipo}` : ''
  const res = await fetch(`${API_URL}/casos/${qs}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Error al cargar galería')
  return res.json()
}

export async function getCasosAdmin(token: string): Promise<Caso[]> {
  const res = await fetch(`${API_URL}/admin/casos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Error al cargar galería admin')
  return res.json()
}

export async function aprobarCaso(token: string, id: number, aprobado: boolean): Promise<Caso> {
  const res = await fetch(`${API_URL}/admin/casos/${id}?aprobado=${aprobado}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error al actualizar caso')
  return res.json()
}

export async function eliminarCaso(token: string, id: number): Promise<void> {
  await fetch(`${API_URL}/admin/casos/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function crearCaso(token: string, formData: FormData): Promise<Caso> {
  const res = await fetch(`${API_URL}/admin/casos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Error al crear caso')
  }
  return res.json()
}
