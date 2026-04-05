import { NextResponse } from 'next/server'

// La protección de rutas admin se maneja en app/admin/layout.tsx
// porque el token vive en localStorage (no en cookies).
// Este middleware existe para futuras extensiones (ej: rate limiting).
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
