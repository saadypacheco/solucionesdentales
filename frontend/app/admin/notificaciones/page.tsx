'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  listarNotifsStaff,
  marcarLeidaStaff,
  marcarTodasLeidasStaff,
  type Notificacion,
} from '@/lib/api/notificaciones'

const PRIORIDAD_BG: Record<string, string> = {
  baja: 'border-l-slate-500/40',
  normal: 'border-l-teal-500/60',
  alta: 'border-l-orange-500/60',
  critica: 'border-l-red-500/80',
}

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

export default function AdminNotificacionesPage() {
  const t = useTranslations('notificaciones')
  const tTipos = useTranslations('notificaciones.tipos')
  const router = useRouter()
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const { token } = useAuthStore()

  const [items, setItems] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas'>('todas')

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await listarNotifsStaff(token, {
        soloNoLeidas: filtro === 'no_leidas',
        limit: 200,
      })
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [token, filtro])

  useEffect(() => {
    if (!token) router.push('/admin/login')
  }, [token, router])

  useEffect(() => { cargar() }, [cargar])

  async function handleMarcarLeida(notif: Notificacion) {
    if (!token || notif.leida) return
    try {
      await marcarLeidaStaff(token, notif.id)
      setItems((prev) => prev.map((n) => n.id === notif.id ? { ...n, leida: true } : n))
    } catch { /* silent */ }
  }

  async function handleMarcarTodas() {
    if (!token) return
    try {
      await marcarTodasLeidasStaff(token)
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })))
    } catch { /* silent */ }
  }

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleString(dateLocale)
  }

  const noLeidasCount = items.filter((n) => !n.leida).length

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        {noLeidasCount > 0 && (
          <button
            onClick={handleMarcarTodas}
            className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-2 rounded-lg transition-colors self-start"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['todas', 'no_leidas'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              filtro === f
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f === 'todas' ? t('viewAll') : t('newCount', { n: noLeidasCount })}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-slate-400">{filtro === 'no_leidas' ? t('noUnread') : t('noNotifs')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Wrapper = n.link ? Link : 'div'
            const wrapperProps = n.link ? { href: n.link } : {}
            return (
              <Wrapper
                key={n.id}
                {...wrapperProps as { href: string }}
                onClick={() => handleMarcarLeida(n)}
                className={`block bg-[--bg-card] border-l-4 border-r border-y border-r-white/5 border-y-white/5 rounded-r-xl p-4 transition-colors hover:bg-white/[.02] cursor-pointer ${
                  PRIORIDAD_BG[n.prioridad]
                } ${!n.leida ? 'bg-teal-500/[.04]' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
                    {tTipos(n.tipo as 'nuevo_turno') ?? n.tipo}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.leida && <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />}
                    <span className="text-xs text-slate-500">{formatFecha(n.created_at)}</span>
                  </div>
                </div>
                <p className={`text-sm leading-tight ${n.leida ? 'text-slate-400' : 'text-white font-bold'}`}>
                  {n.titulo}
                </p>
                {n.mensaje && <p className="text-xs text-slate-500 mt-1">{n.mensaje}</p>}
              </Wrapper>
            )
          })}
        </div>
      )}
    </div>
  )
}
