/**
 * Resolución dinámica del consultorio_id según el hostname del browser.
 *
 * Estrategia (M13 Fase 5b — multi-tenant por dominio):
 *   1. Si el browser ya resolvió el hostname y lo cacheó en sessionStorage → usar ese.
 *   2. Si hay NEXT_PUBLIC_CONSULTORIO_ID en build env → usar ese (override manual / dev).
 *   3. Fallback a "1" para preservar el cliente actual hasta que el resolver corra.
 *
 * El componente <TenantResolver /> en el layout se encarga de hacer la primera
 * llamada a /consultorios/resolver-hostname al montar la app y popular el cache.
 */

const CACHE_KEY = 'sd_tenant_v1'

export interface TenantInfo {
  consultorio_id: number
  nombre: string | null
  pais_codigo: string | null
  idioma: string
  moneda: string | null
  timezone: string | null
  hostname_resuelto: string
  fallback_aplicado: boolean
}

export function getCachedTenant(): TenantInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TenantInfo
  } catch {
    return null
  }
}

export function setCachedTenant(info: TenantInfo): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(info))
  } catch { /* sessionStorage lleno o deshabilitado */ }
}

export function clearCachedTenant(): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}

/** ID del consultorio público a usar en la próxima request. Síncrono. */
export function getConsultorioPublicoId(): string {
  const cached = getCachedTenant()
  if (cached) return String(cached.consultorio_id)
  if (process.env.NEXT_PUBLIC_CONSULTORIO_ID) return process.env.NEXT_PUBLIC_CONSULTORIO_ID
  return '1'
}

/** Headers para todas las llamadas públicas del API client. */
export function tenantHeaders(): Record<string, string> {
  return { 'X-Consultorio-ID': getConsultorioPublicoId() }
}

/**
 * Llama al backend para resolver el hostname actual del browser → tenant.
 * Si el cache ya tiene info para este hostname, no vuelve a llamar.
 * Devuelve el tenant resuelto (o el fallback si el endpoint falla).
 */
export async function resolveTenantFromHost(): Promise<TenantInfo | null> {
  if (typeof window === 'undefined') return null
  const host = window.location.host
  const cached = getCachedTenant()
  if (cached && cached.hostname_resuelto === host.toLowerCase().split(':')[0].replace(/\/$/, '')) {
    return cached
  }

  try {
    const res = await fetch(`/api/proxy/consultorios/resolver-hostname?host=${encodeURIComponent(host)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const info = await res.json() as TenantInfo
    setCachedTenant(info)
    return info
  } catch {
    return null
  }
}
