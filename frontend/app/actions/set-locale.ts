'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  LOCALE_COOKIE_NAME,
  isValidLocale,
  type Locale,
} from '@/i18n/config'

/**
 * Server action: setea la cookie de idioma y revalida la página.
 * El switcher la invoca al cambiar de idioma.
 */
export async function setLocale(locale: Locale) {
  if (!isValidLocale(locale)) return

  cookies().set(LOCALE_COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
}
