'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  listarConsultorios,
  suspenderConsultorio,
  reactivarConsultorio,
} from '@/lib/api/superadmin'
import { getPaises, type ConsultorioFull, type Pais } from '@/lib/api/consultorios'

const ESTADO_BADGE: Record<string, string> = {
  onboarding: 'bg-slate-500/15 text-slate-400',
  docs_pendientes: 'bg-yellow-500/15 text-yellow-400',
  en_revision: 'bg-blue-500/15 text-blue-400',
  verificado: 'bg-green-500/15 text-green-400',
  suspendido: 'bg-red-500/15 text-red-400',
}

const ESTADOS = ['onboarding', 'docs_pendientes', 'en_revision', 'verificado', 'suspendido']

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

export default function SuperadminConsultoriosPage() {
  const t = useTranslations('superadmin.consultorios')
  const tEstados = useTranslations('admin.compliance.estados')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const { token } = useAuthStore()

  const [consultorios, setConsultorios] = useState<ConsultorioFull[]>([])
  const [paises, setPaises] = useState<Pais[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPais, setFiltroPais] = useState('')

  useEffect(() => {
    if (!token) return
    Promise.all([
      listarConsultorios(token),
      getPaises(),
    ])
      .then(([c, p]) => { setConsultorios(c); setPaises(p) })
      .finally(() => setLoading(false))
  }, [token])

  const filtrados = useMemo(() => {
    return consultorios.filter((c) => {
      if (filtroEstado && c.estado_compliance !== filtroEstado) return false
      if (filtroPais && c.pais_codigo !== filtroPais) return false
      return true
    })
  }, [consultorios, filtroEstado, filtroPais])

  async function handleSuspender(c: ConsultorioFull) {
    if (!token || !confirm(t('actions.confirmSuspend'))) return
    await suspenderConsultorio(token, c.id)
    setConsultorios((prev) => prev.map((x) => x.id === c.id ? { ...x, estado_compliance: 'suspendido' } : x))
  }

  async function handleReactivar(c: ConsultorioFull) {
    if (!token || !confirm(t('actions.confirmReactivate'))) return
    const res = await reactivarConsultorio(token, c.id)
    setConsultorios((prev) => prev.map((x) => x.id === c.id ? { ...x, estado_compliance: res.estado_compliance as ConsultorioFull['estado_compliance'] } : x))
  }

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm">{t('totalCount', { n: consultorios.length })}</p>
        </div>
        <Link
          href="/onboarding"
          className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          {t('newConsultorio')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="">{t('allStates')}</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{tEstados(e)}</option>)}
        </select>
        <select
          value={filtroPais}
          onChange={(e) => setFiltroPais(e.target.value)}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="">{t('allCountries')}</option>
          {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20 text-slate-400">{t('noResults')}</div>
      ) : (
        <div className="bg-[--bg-card] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-widest">
                <th className="text-left px-4 py-3">{t('table.name')}</th>
                <th className="text-left px-4 py-3">{t('table.country')}</th>
                <th className="text-left px-4 py-3">{t('table.state')}</th>
                <th className="text-left px-4 py-3">{t('table.created')}</th>
                <th className="text-left px-4 py-3">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-white/[.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{c.pais_codigo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ESTADO_BADGE[c.estado_compliance] ?? 'text-slate-500'}`}>
                      {tEstados(c.estado_compliance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatFecha(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/superadmin/consultorios/${c.id}`} className="text-xs text-teal-400 hover:text-teal-300 font-semibold">
                        {t('actions.view')}
                      </Link>
                      {c.estado_compliance === 'suspendido' ? (
                        <button onClick={() => handleReactivar(c)} className="text-xs text-green-400 hover:text-green-300 font-semibold">
                          {t('actions.reactivate')}
                        </button>
                      ) : (
                        <button onClick={() => handleSuspender(c)} className="text-xs text-red-400 hover:text-red-300 font-semibold">
                          {t('actions.suspend')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
