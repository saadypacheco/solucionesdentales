import { NextRequest, NextResponse } from 'next/server'
import { LOCALES, LOCALE_COOKIE_NAME, DEFAULT_LOCALE, type Locale } from '@/i18n/config'

function detectFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE
  const candidates = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())

  for (const candidate of candidates) {
    if (candidate === 'pt-br' || candidate.startsWith('pt')) return 'pt-BR'
    if (candidate.startsWith('en')) return 'en'
    if (candidate.startsWith('es')) return 'es'
  }
  return DEFAULT_LOCALE
}

export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value

  // Si ya tiene cookie válida, no toco nada
  if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
    return NextResponse.next()
  }

  // Primera visita: detecto del Accept-Language y seteo cookie
  const detected = detectFromAcceptLanguage(request.headers.get('accept-language'))
  const response = NextResponse.next()
  response.cookies.set(LOCALE_COOKIE_NAME, detected, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  // Aplica a todo menos assets estáticos y rutas internas
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/proxy|.*\\..*).*)'],
}
