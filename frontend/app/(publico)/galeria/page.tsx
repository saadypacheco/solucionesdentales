'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getCasos, type Caso } from '@/lib/api/casos'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const FILTROS_KEYS = ['todos', 'estetica', 'blanqueamiento', 'ortodoncia', 'implante'] as const
const FILTRO_TO_API: Record<typeof FILTROS_KEYS[number], string> = {
  todos: '',
  estetica: 'estetica',
  blanqueamiento: 'blanqueamiento',
  ortodoncia: 'ortodoncia',
  implante: 'implante',
}

function SliderAntesDepues({ antes, despues, alt, beforeLabel, afterLabel }: {
  antes: string; despues: string; alt: string; beforeLabel: string; afterLabel: string
}) {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const mover = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
    setPos(pct)
  }, [])

  const onMouseDown = () => { dragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => { if (dragging.current) mover(e.clientX) }
  const onMouseUp   = () => { dragging.current = false }

  const onTouchStart = () => { dragging.current = true }
  const onTouchMove  = (e: React.TouchEvent) => { if (dragging.current) mover(e.touches[0].clientX) }
  const onTouchEnd   = () => { dragging.current = false }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] overflow-hidden rounded-xl cursor-ew-resize select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={despues} alt={`${alt} — ${afterLabel}`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={antes} alt={`${alt} — ${beforeLabel}`} className="w-full h-full object-cover" draggable={false} />
      </div>

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-xl flex items-center justify-center gap-0.5 border border-slate-200">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2L1 6l3 4M8 2l3 4-3 4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <span className="absolute top-3 left-3 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 bg-teal-600/90 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
        {afterLabel}
      </span>
    </div>
  )
}

function CasoCard({ caso, beforeLabel, afterLabel }: { caso: Caso; beforeLabel: string; afterLabel: string }) {
  return (
    <div className="bg-[--bg-card] rounded-2xl overflow-hidden border border-white/5 card-teal-hover">
      <SliderAntesDepues
        antes={caso.imagen_antes_url}
        despues={caso.imagen_despues_url}
        alt={caso.tipo_tratamiento}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
            {caso.tipo_tratamiento}
          </span>
          {caso.duracion_tratamiento && (
            <span className="text-xs text-slate-500">⏱ {caso.duracion_tratamiento}</span>
          )}
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{caso.descripcion}</p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-[--bg-card] rounded-2xl overflow-hidden border border-white/5 animate-pulse">
      <div className="aspect-[4/3] bg-slate-800" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-24 bg-slate-700 rounded" />
        <div className="h-4 w-full bg-slate-700 rounded" />
        <div className="h-4 w-3/4 bg-slate-700 rounded" />
      </div>
    </div>
  )
}

export default function GaleriaPage() {
  const t = useTranslations('galeria')
  const tNavbar = useTranslations('navbar')
  const [filtro, setFiltro] = useState<typeof FILTROS_KEYS[number]>('todos')
  const [casos, setCasos] = useState<Caso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const apiFilter = FILTRO_TO_API[filtro] || undefined
    getCasos(apiFilter)
      .then(setCasos)
      .catch(() => setError(t('loadError')))
      .finally(() => setLoading(false))
  }, [filtro, t])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
      <header className="glass-dark sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-teal-400 font-semibold text-sm hover:text-teal-300 transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {tNavbar('back')}
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/turnos"
              className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2 rounded-full transition-colors btn-shine"
            >
              {tNavbar('bookCta')}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-teal-400 text-sm font-bold tracking-widest uppercase mb-3">
            {t('kicker')}
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            {t('headerLine1')}{' '}
            <span className="gradient-text">{t('headerLine2')}</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            {t('drag')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {FILTROS_KEYS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filtro === f
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'border-white/10 text-slate-400 hover:border-teal-500/50 hover:text-teal-300'
              }`}
            >
              {t(`filtros.${f}`)}
            </button>
          ))}
        </div>

        {error ? (
          <div className="text-center py-20 text-slate-400">{error}</div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : casos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🦷</p>
            <p className="text-slate-400 text-lg">{t('noCases')}</p>
            <p className="text-slate-500 text-sm mt-2">{t('noCasesHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {casos.map((c) => <CasoCard key={c.id} caso={c} beforeLabel={t('before')} afterLabel={t('after')} />)}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-block glass rounded-3xl px-10 py-8">
            <p className="text-white font-bold text-xl mb-2">{t('ctaTitle')}</p>
            <p className="text-slate-400 text-sm mb-6">{t('ctaSubtitle')}</p>
            <Link
              href="/turnos"
              className="inline-block bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-3 rounded-full transition-colors glow-teal-sm btn-shine"
            >
              {t('ctaButton')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
