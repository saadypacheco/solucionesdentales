// Configuración central de idiomas soportados.
// Para agregar un idioma: sumarlo acá + crear messages/{locale}.json + tipear en switcher.

export const LOCALES = ['es', 'en', 'pt-BR'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'es'

// Nombres mostrados en el switcher
export const LOCALE_LABELS: Record<Locale, string> = {
  'es': 'Español',
  'en': 'English',
  'pt-BR': 'Português',
}

// Códigos cortos para botones compactos
export const LOCALE_SHORT: Record<Locale, string> = {
  'es': 'ES',
  'en': 'EN',
  'pt-BR': 'PT',
}

// Mapping de país (M13) → idioma default cuando esté implementado
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  AR: 'es',
  BO: 'es',
  US: 'en',
  BR: 'pt-BR',
}

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

export function isValidLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}
