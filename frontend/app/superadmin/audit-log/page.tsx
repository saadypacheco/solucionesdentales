'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { listarAuditLog, type AuditEntry } from '@/lib/api/superadmin'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

export default function AuditLogPage() {
  const t = useTranslations('superadmin.audit')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const { token } = useAuthStore()

  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroConsultorio, setFiltroConsultorio] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [limit, setLimit] = useState(100)

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await listarAuditLog(token, {
        consultorio_id: filtroConsultorio ? parseInt(filtroConsultorio) : undefined,
        accion: filtroAccion || undefined,
        limit,
      })
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }, [token, filtroConsultorio, filtroAccion, limit])

  useEffect(() => { cargar() }, [cargar])

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleString(dateLocale)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">{t('title')}</h1>
        <p className="text-slate-400 text-sm">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="number"
          placeholder={t('filterConsultorio')}
          value={filtroConsultorio}
          onChange={(e) => setFiltroConsultorio(e.target.value)}
          className="w-full sm:w-40 bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        />
        <input
          type="text"
          placeholder={t('filterAccion')}
          value={filtroAccion}
          onChange={(e) => setFiltroAccion(e.target.value)}
          className="flex-1 bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        />
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="500">500</option>
          <option value="1000">1000</option>
        </select>
        <button
          onClick={() => {
            if (!token) return
            const params = new URLSearchParams()
            if (filtroConsultorio) params.set('consultorio_id', filtroConsultorio)
            if (filtroAccion) params.set('accion', filtroAccion)
            params.set('limit', '5000')
            // Trigger download via fetch+blob para incluir Authorization header
            fetch(`/api/proxy/superadmin/audit-log.csv?${params.toString()}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              })
          }}
          className="bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 text-sm font-bold px-4 py-2 rounded-xl"
        >
          📥 {t('exportCSV')}
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : entries.length === 0 ? (
        <div className="text-slate-400 text-center py-20">{t('noEntries')}</div>
      ) : (
        <div className="bg-[--bg-card] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 uppercase tracking-widest">
                <th className="text-left px-3 py-2">{t('table.fecha')}</th>
                <th className="text-left px-3 py-2">{t('table.consultorio')}</th>
                <th className="text-left px-3 py-2">{t('table.accion')}</th>
                <th className="text-left px-3 py-2">{t('table.recurso')}</th>
                <th className="text-left px-3 py-2">{t('table.usuario')}</th>
                <th className="text-left px-3 py-2">{t('table.ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-white/[.02]">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{formatFecha(e.created_at)}</td>
                  <td className="px-3 py-2 text-slate-300">{e.consultorio_id ?? '—'}</td>
                  <td className="px-3 py-2 text-teal-400 font-mono">{e.accion}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {e.recurso_tipo ? `${e.recurso_tipo}${e.recurso_id ? `:${e.recurso_id}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{e.usuario_id ? e.usuario_id.slice(0, 8) : '—'}</td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{e.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
