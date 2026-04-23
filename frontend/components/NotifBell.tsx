'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  countNoLeidasStaff,
  listarNotifsStaff,
  marcarLeidaStaff,
  marcarTodasLeidasStaff,
  type Notificacion,
} from '@/lib/api/notificaciones'

const POLL_INTERVAL_MS = 30_000  // Polling 30s — futuro: Realtime via Supabase

const PRIORIDAD_DOT: Record<string, string> = {
  baja: 'bg-slate-400',
  normal: 'bg-teal-400',
  alta: 'bg-orange-400',
  critica: 'bg-red-500',
}

export default function NotifBell() {
  const t = useTranslations('notificaciones')
  const tTipos = useTranslations('notificaciones.tipos')
  const locale = useLocale()

  function formatRelative(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime()
    const min = Math.floor(ms / 60000)
    if (min < 1) return t('ago.now')
    if (min < 60) return t('ago.minutes', { n: min })
    const h = Math.floor(min / 60)
    if (h < 24) return t('ago.hours', { n: h })
    const d = Math.floor(h / 24)
    if (d < 7) return t('ago.days', { n: d })
    const dateLocale = locale === 'pt-BR' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'es-AR'
    return t('ago.date', { fecha: new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) })
  }
  const { token } = useAuthStore()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Polling del count
  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function fetchCount() {
      try {
        const res = await countNoLeidasStaff(token!)
        if (!cancelled) setCount(res.no_leidas)
      } catch { /* silent */ }
    }

    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [token])

  // Cargar items cuando se abre el dropdown
  useEffect(() => {
    if (!open || !token) return
    setLoading(true)
    listarNotifsStaff(token, { limit: 10 })
      .then(setItems)
      .finally(() => setLoading(false))
  }, [open, token])

  // Cerrar al click afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleClick(notif: Notificacion) {
    if (!token) return
    if (!notif.leida) {
      try {
        await marcarLeidaStaff(token, notif.id)
        setCount((c) => Math.max(0, c - 1))
        setItems((prev) => prev.map((n) => n.id === notif.id ? { ...n, leida: true } : n))
      } catch { /* silent */ }
    }
    if (notif.link) {
      setOpen(false)
      window.location.href = notif.link
    }
  }

  async function marcarTodas() {
    if (!token) return
    try {
      await marcarTodasLeidasStaff(token)
      setCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })))
    } catch { /* silent */ }
  }

  if (!token) return null

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('ariaOpen')}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full px-1 flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-white font-bold text-sm">{t('title')}</p>
            {count > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">{t('loading')}</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">{t('noNotifs')}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[.04] hover:bg-white/[.03] transition-colors ${
                    !n.leida ? 'bg-teal-500/[.06]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${PRIORIDAD_DOT[n.prioridad]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {tTipos(n.tipo as 'nuevo_turno') ?? n.tipo}
                        </span>
                        <span className="text-[10px] text-slate-600">{formatRelative(n.created_at)}</span>
                      </div>
                      <p className={`text-sm leading-tight ${n.leida ? 'text-slate-400' : 'text-white font-semibold'}`}>
                        {n.titulo}
                      </p>
                      {n.mensaje && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <Link
            href="/admin/notificaciones"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs text-teal-400 hover:text-teal-300 hover:bg-white/5 border-t border-white/5"
          >
            {t('viewAll')} →
          </Link>
        </div>
      )}
    </div>
  )
}
