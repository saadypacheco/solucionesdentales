'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from '@/i18n/config'
import { setLocale } from '@/app/actions/set-locale'

type Variant = 'compact' | 'full'

export default function LanguageSwitcher({ variant = 'compact' }: { variant?: Variant }) {
  const currentLocale = useLocale() as Locale
  const t = useTranslations('languageSwitcher')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleChange(locale: Locale) {
    setOpen(false)
    if (locale === currentLocale) return
    startTransition(() => {
      setLocale(locale)
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-label={t('selectLanguage')}
        aria-expanded={open}
        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50"
      >
        {variant === 'full' ? LOCALE_LABELS[currentLocale] : LOCALE_SHORT[currentLocale]}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('label')}
          className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          {LOCALES.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                role="option"
                aria-selected={loc === currentLocale}
                onClick={() => handleChange(loc)}
                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                  loc === currentLocale
                    ? 'bg-teal-600/20 text-teal-300'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {LOCALE_LABELS[loc]}
                {loc === currentLocale && (
                  <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
