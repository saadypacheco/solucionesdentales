// Server-side: resuelve qué idioma cargar para cada request.
// next-intl llama a este config en cada Server Component / API.
import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALES,
  isValidLocale,
  type Locale,
} from './config'

function detectFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE
  // Parsear "en-US,en;q=0.9,es;q=0.8"
  const candidates = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())

  for (const candidate of candidates) {
    // Match exacto pt-BR
    if (candidate === 'pt-br') return 'pt-BR'
    // Match por prefijo
    if (candidate.startsWith('pt')) return 'pt-BR'
    if (candidate.startsWith('en')) return 'en'
    if (candidate.startsWith('es')) return 'es'
  }
  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value

  let locale: Locale = DEFAULT_LOCALE
  if (isValidLocale(cookieLocale)) {
    locale = cookieLocale
  } else {
    // Primera visita: detectar del browser
    const acceptLanguage = headers().get('accept-language')
    locale = detectFromAcceptLanguage(acceptLanguage)
  }

  const messages = (await import(`../messages/${locale}.json`)).default

  return {
    locale,
    messages,
  }
})
