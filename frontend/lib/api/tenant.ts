/**
 * Resuelve el consultorio_id "default" para endpoints públicos del frontend.
 *
 * Estrategia (M13 Fase 5a):
 *   - Lee NEXT_PUBLIC_CONSULTORIO_ID (env del build)
 *   - Si no está, devuelve 1 (consultorio default original)
 *
 * Cada deploy del frontend representa un consultorio. Si más adelante se hace
 * multi-tenant por subdominio (acme.solucionodont.shop → consultorio "acme"),
 * acá se cambia para resolver dinámicamente.
 */
export function getConsultorioPublicoId(): string {
  return process.env.NEXT_PUBLIC_CONSULTORIO_ID || '1'
}

/**
 * Header que se inyecta en todas las llamadas públicas del API client.
 * El backend lee X-Consultorio-ID en core/tenant.resolve_consultorio_publico.
 */
export function tenantHeaders(): Record<string, string> {
  return { 'X-Consultorio-ID': getConsultorioPublicoId() }
}
