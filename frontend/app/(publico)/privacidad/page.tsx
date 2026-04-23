'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getPoliticaPrivacidad, type PoliticaPrivacidad } from '@/lib/api/consultorios'
import { getConsultorioPublicoId } from '@/lib/api/tenant'
import LanguageSwitcher from '@/components/LanguageSwitcher'

/**
 * Render minimalista de markdown.
 * Soporta solo: **bold**, ## h2, listas con -, párrafos.
 */
function MarkdownRender({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flushList() {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc pl-6 space-y-1 text-slate-300 my-3">
        {listBuffer.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
        ))}
      </ul>
    )
    listBuffer = []
  }

  function parseInline(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushList()
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      elements.push(<h2 key={elements.length} className="text-xl font-black text-white mt-6 mb-3">{line.slice(3)}</h2>)
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      flushList()
      elements.push(
        <h3 key={elements.length} className="text-base font-bold text-teal-300 mt-5 mb-2">{line.slice(2, -2)}</h3>
      )
    } else {
      flushList()
      elements.push(
        <p key={elements.length} className="text-slate-300 leading-relaxed my-2"
           dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
      )
    }
  }
  flushList()
  return <>{elements}</>
}

export default function PrivacidadPage() {
  const t = useTranslations('privacidad')
  const tNav = useTranslations('navbar')
  const locale = useLocale()
  const [politica, setPolitica] = useState<PoliticaPrivacidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const consultorioId = parseInt(getConsultorioPublicoId())
    getPoliticaPrivacidad(consultorioId, locale)
      .then(setPolitica)
      .catch(() => setError(t('loadError')))
      .finally(() => setLoading(false))
  }, [locale, t])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
      <header className="glass-dark sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-teal-400 font-semibold text-sm hover:text-teal-300">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {tNav('back')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black text-white mb-2">{t('pageTitle')}</h1>

        {loading ? (
          <p className="text-slate-400">{t('loading')}</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : politica ? (
          <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 md:p-8">
            <MarkdownRender text={politica.texto_markdown} />
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{t('version', { version: politica.version })}</span>
              <span>·</span>
              <span>{politica.pais_codigo}</span>
              <span>·</span>
              <span>{politica.idioma}</span>
            </div>
          </div>
        ) : null}
      </article>
    </div>
  )
}
