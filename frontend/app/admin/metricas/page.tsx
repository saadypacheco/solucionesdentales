'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { getMetricas, type MetricasResultado } from '@/lib/api/admin'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

function KPICard({ label, value, sub, color = 'text-teal-400' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-4">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-black mt-1 number-display ${color}`}>{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function FunnelStep({ label, value, max, color }: {
  label: string; value: number; max: number; color: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-slate-300 text-sm font-medium">{label}</span>
        <span className="text-white font-black number-display">{value}</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function BarChart({ data, locale }: { data: { fecha: string; count: number }[]; locale: string }) {
  if (!data.length) {
    return null
  }
  const max = Math.max(...data.map((d) => d.count), 1)
  const dateLocale = localeForDateFormat(locale)
  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto py-2">
      {data.map((d) => {
        const altura = (d.count / max) * 100
        const fechaCorta = new Date(d.fecha).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
        return (
          <div key={d.fecha} className="flex flex-col items-center gap-1 min-w-[28px] flex-1" title={`${fechaCorta}: ${d.count}`}>
            <div
              className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-sm transition-all hover:from-teal-500 hover:to-teal-300"
              style={{ height: `${Math.max(altura, 4)}%` }}
            />
            <span className="text-slate-600 text-[9px] -rotate-45 origin-top-right whitespace-nowrap">
              {fechaCorta}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function MetricasPage() {
  const t = useTranslations('admin.metricas')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const { token } = useAuthStore()
  const [data, setData] = useState<MetricasResultado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dias, setDias] = useState(30)

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    setLoading(true)
    getMetricas(token, dias)
      .then(setData)
      .catch((e: Error) => setError(e.message ?? t('errorLoad')))
      .finally(() => setLoading(false))
  }, [token, dias, router, t])

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        <select
          value={dias}
          onChange={(e) => setDias(parseInt(e.target.value))}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value={7}>{t('range.7d')}</option>
          <option value={30}>{t('range.30d')}</option>
          <option value={90}>{t('range.90d')}</option>
          <option value={180}>{t('range.180d')}</option>
          <option value={365}>{t('range.1y')}</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="text-slate-400 text-center py-20">{tCommon('loading')}</div>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard label={t('kpi.newPatients')}     value={data.funnel.pacientes_nuevos}        color="text-teal-400" />
            <KPICard label={t('kpi.totalAppts')}      value={data.turnos.total}                   color="text-sky-400" />
            <KPICard label={t('kpi.attendanceRate')}  value={`${data.turnos.tasa_asistencia}%`}    color="text-emerald-400" sub={t('kpi.attendanceSub')} />
            <KPICard label={t('kpi.chatConversion')}  value={`${data.chat_engagement.tasa_conversion}%`} color="text-violet-400" sub={t('kpi.chatConversionSub', { n: data.chat_engagement.sesiones_total })} />
          </div>

          {/* Funnel de conversión */}
          <section className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-1">{t('funnel.title')}</h3>
            <p className="text-slate-500 text-xs mb-5">{t('funnel.desc')}</p>
            <div className="space-y-4">
              <FunnelStep label={t('funnel.newPatients')} value={data.funnel.pacientes_nuevos}  max={data.funnel.pacientes_nuevos} color="bg-teal-500" />
              <FunnelStep label={t('funnel.withChat')}    value={data.funnel.con_chat}           max={data.funnel.pacientes_nuevos || 1} color="bg-sky-500" />
              <FunnelStep label={t('funnel.withAppt')}    value={data.funnel.con_turno}          max={data.funnel.pacientes_nuevos || 1} color="bg-violet-500" />
              <FunnelStep label={t('funnel.attended')}    value={data.funnel.asistidos}          max={data.funnel.pacientes_nuevos || 1} color="bg-emerald-500" />
            </div>
          </section>

          {/* Turnos por día + por estado */}
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-1">{t('apptsPerDay.title')}</h3>
              <p className="text-slate-500 text-xs mb-4">{t('apptsPerDay.desc')}</p>
              {data.turnos.por_dia.length ? (
                <BarChart data={data.turnos.por_dia} locale={locale} />
              ) : (
                <p className="text-slate-600 text-sm text-center py-8">{t('apptsPerDay.empty')}</p>
              )}
            </section>

            <section className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-1">{t('byState.title')}</h3>
              <p className="text-slate-500 text-xs mb-4">{t('byState.desc')}</p>
              <div className="space-y-2">
                {Object.entries(data.turnos.por_estado).length === 0 && (
                  <p className="text-slate-600 text-sm">{t('byState.empty')}</p>
                )}
                {Object.entries(data.turnos.por_estado).map(([estado, count]) => {
                  const max = Math.max(...Object.values(data.turnos.por_estado), 1)
                  const pct = (count / max) * 100
                  const color =
                    estado === 'realizado' ? 'bg-emerald-500' :
                    estado === 'confirmado' ? 'bg-teal-500' :
                    estado === 'solicitado' ? 'bg-yellow-500' :
                    estado === 'cancelado' || estado === 'ausente' ? 'bg-red-500' :
                    'bg-slate-500'
                  return (
                    <div key={estado}>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-slate-300 text-sm capitalize">{estado.replace('_', ' ')}</span>
                        <span className="text-slate-400 text-xs font-bold">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Seguimiento + Telemedicina */}
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-1">{t('followUp.title')}</h3>
              <p className="text-slate-500 text-xs mb-4">{t('followUp.desc')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">{t('followUp.generated')}</p>
                  <p className="text-2xl font-black text-white number-display">{data.seguimiento.alarmas_generadas}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">{t('followUp.resolved')}</p>
                  <p className="text-2xl font-black text-emerald-400 number-display">{data.seguimiento.alarmas_resueltas}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">{t('followUp.highPriority')}</p>
                  <p className="text-2xl font-black text-rose-400 number-display">{data.seguimiento.alarmas_alta_prioridad}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">{t('followUp.effectiveness')}</p>
                  <p className="text-2xl font-black text-teal-400 number-display">{data.seguimiento.efectividad}%</p>
                </div>
              </div>
            </section>

            <section className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-1">{t('telemed.title')}</h3>
              <p className="text-slate-500 text-xs mb-4">{t('telemed.desc')}</p>
              <div className="space-y-3">
                <div className="bg-slate-900/50 rounded-xl p-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-slate-500 text-xs">{t('telemed.virtualCount')}</p>
                    <p className="text-2xl font-black text-fuchsia-400 number-display">{data.telemedicina.turnos_virtuales}</p>
                  </div>
                  <span className="text-fuchsia-300 text-sm font-bold">{data.telemedicina.porcentaje_virtual}% {t('telemed.ofTotal')}</span>
                </div>
                {Object.entries(data.telemedicina.pagos_por_estado).map(([estado, count]) => (
                  <div key={estado} className="flex items-center justify-between text-sm bg-slate-900/30 rounded-lg px-3 py-2">
                    <span className="text-slate-400 capitalize">{estado.replace('_', ' ')}</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <p className="text-slate-600 text-xs text-center pt-4">
            {t('footer.note', { dias })}
          </p>
        </>
      )}
    </div>
  )
}
