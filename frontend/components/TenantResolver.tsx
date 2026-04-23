'use client'

import { useEffect } from 'react'
import { resolveTenantFromHost } from '@/lib/api/tenant'

/**
 * Componente "fire-and-forget" que resuelve el tenant desde el hostname
 * apenas se monta la app. Pone el resultado en sessionStorage para que
 * `tenantHeaders()` lo encuentre síncrono en las siguientes requests.
 *
 * Si la primera request del usuario sale antes de que termine la resolución,
 * va al fallback (consultorio_id=1) — una vez resuelto, las siguientes
 * usan el correcto. La pequeña ventana de carrera se acepta porque el
 * 99% del tráfico es navegación posterior, no la primera milisegundo.
 */
export default function TenantResolver() {
  useEffect(() => {
    resolveTenantFromHost()
  }, [])
  return null
}
