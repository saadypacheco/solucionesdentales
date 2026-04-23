'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { getTurnosAdmin, patchTurnoEstado, checkInRecepcion, type TurnoAdmin } from '@/lib/api/admin'

function semanaDesde(base: Date): Date[] {
  const dias: Date[] = []
  const lunes = new Date(base)
  const dayOfWeek = lunes.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  lunes.setDate(lunes.getDate() + diff)
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    dias.push(d)
  }
  return dias
}

function mesDesde(base: Date): Date[] {
  const year = base.getFullYear()
  const month = base.getMonth()
  const primerDia = new Date(year, month, 1)
  const ultimoDia = new Date(year, month + 1, 0)
  // Empezar desde el lunes anterior al primer día del mes
  const offset = primerDia.getDay() === 0 ? -6 : 1 - primerDia.getDay()
  const inicio = new Date(primerDia)
  inicio.setDate(primerDia.getDate() + offset)

  const dias: Date[] = []
  const cursor = new Date(inicio)
  while (cursor <= ultimoDia || dias.length % 7 !== 0) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

const ESTADOS = ['solicitado', 'confirmado', 'realizado', 'cancelado', 'ausente'] as const
type Estado = typeof ESTADOS[number]

const estadoBadge: Record<Estado, string> = {
  confirmado:  'bg-green-500/15 text-green-400 border-green-500/20',
  solicitado:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  realizado:   'bg-slate-500/15 text-slate-400 border-slate-500/20',
  cancelado:   'bg-red-500/15 text-red-400 border-red-500/20',
  ausente:     'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

function TarjetaTurno({ turno, token, onChange, formatHora }: {
  turno: TurnoAdmin
  token: string
  onChange: (t: TurnoAdmin) => void
  formatHora: (iso: string) => string
}) {
  const t = useTranslations('admin.agenda')
  const tEstados = useTranslations('estadosTurno')
  const [cambiando, setCambiando] = useState(false)
  const [llegando, setLlegando] = useState(false)
  const [llegadaOk, setLlegadaOk] = useState(false)

  async function cambiarEstado(estado: string) {
    setCambiando(true)
    try {
      const actualizado = await patchTurnoEstado(token, turno.id, estado)
      onChange(actualizado)
    } finally {
      setCambiando(false)
    }
  }

  async function marcarLlegada() {
    setLlegando(true)
    try {
      await checkInRecepcion(token, turno.id)
      setLlegadaOk(true)
      setTimeout(() => setLlegadaOk(false), 4000)
    } catch {
      // silencio: la notif puede fallar y el flujo de turno sigue
    } finally {
      setLlegando(false)
    }
  }

  const esPresencial = !turno.modalidad || turno.modalidad === 'presencial'
  const puedeMarcarLlegada = esPresencial && (turno.estado === 'confirmado' || turno.estado === 'solicitado')

  const waLink = `https://wa.me/${turno.pacientes?.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(
    t('whatsappMessage', {
      nombre: turno.pacientes?.nombre ?? '',
      tratamiento: turno.tipo_tratamiento,
      hora: formatHora(turno.fecha_hora),
    })
  )}`

  return (
    <div className={`bg-[--bg-card] border rounded-xl p-3 ${estadoBadge[turno.estado as Estado] ?? 'border-white/5'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-white text-sm font-bold">{formatHora(turno.fecha_hora)}</p>
          <p className="text-slate-300 text-sm">{turno.pacientes?.nombre ?? '—'}</p>
          <p className="text-slate-500 text-xs">{turno.tipo_tratamiento} · {t('minutes', { n: turno.duracion_minutos })}</p>
        </div>
        {turno.pacientes?.telefono && (
          <a href={waLink} target="_blank" className="text-green-400 hover:text-green-300 flex-shrink-0 mt-0.5" title="WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.25.626 4.35 1.714 6.126L.057 23.882l5.9-1.548A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.504.92.936-3.41-.234-.37A9.818 9.818 0 112 12c0-5.422 4.396-9.818 9.818-9.818S21.636 6.578 21.636 12 17.24 21.818 12 21.818z"/>
            </svg>
          </a>
        )}
      </div>

      <select
        value={turno.estado}
        disabled={cambiando}
        onChange={(e) => cambiarEstado(e.target.value)}
        className="w-full bg-transparent border border-white/10 text-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-teal-500 disabled:opacity-50"
      >
        {ESTADOS.map((e) => <option key={e} value={e}>{tEstados(e)}</option>)}
      </select>

      {puedeMarcarLlegada && (
        <button
          onClick={marcarLlegada}
          disabled={llegando}
          className={`mt-1.5 w-full text-xs font-bold py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            llegadaOk
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-teal-500/15 text-teal-400 border border-teal-500/30 hover:bg-teal-500/25'
          }`}
        >
          {llegadaOk ? `✓ ${t('arrivalNotified')}` : llegando ? t('arrivalSending') : `🚪 ${t('markArrival')}`}
        </button>
      )}

      {turno.notas && (
        <p className="text-slate-500 text-xs mt-1.5 truncate" title={turno.notas}>📝 {turno.notas}</p>
      )}
    </div>
  )
}

export default function AdminAgendaPage() {
  const t = useTranslations('admin.agenda')
  const tEstados = useTranslations('estadosTurno')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)

  const router = useRouter()
  const { token } = useAuthStore()
  const [vista, setVista] = useState<'semana' | 'mes'>('semana')
  const [semanaBase, setSemanaBase] = useState<Date>(new Date())
  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(toDateStr(new Date()))

  const semana = semanaDesde(semanaBase)
  const mes = mesDesde(semanaBase)
  const diasMostrar = vista === 'semana' ? semana : mes

  function formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
  }

  function formatDia(d: Date, corto = false): string {
    return d.toLocaleDateString(dateLocale, {
      weekday: corto ? 'short' : 'long',
      day: 'numeric',
      month: corto ? undefined : 'short',
    })
  }

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    setLoading(true)
    Promise.all(diasMostrar.map((d) => getTurnosAdmin(token, toDateStr(d))))
      .then((resultados) => setTurnos(resultados.flat()))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, vista, toDateStr(diasMostrar[0]), toDateStr(diasMostrar[diasMostrar.length - 1])])

  function turnosDel(dia: Date): TurnoAdmin[] {
    const fecha = toDateStr(dia)
    return turnos
      .filter((tt) => tt.fecha_hora.startsWith(fecha))
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
  }

  function handleCambio(actualizado: TurnoAdmin) {
    setTurnos((prev) => prev.map((tt) => tt.id === actualizado.id ? actualizado : tt))
  }

  const hoy = toDateStr(new Date())

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {vista === 'semana'
              ? t('weekOf', { fecha: semana[0].toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' }) })
              : semanaBase.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-800/60 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setVista('semana')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                vista === 'semana' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('viewWeek')}
            </button>
            <button
              onClick={() => setVista('mes')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                vista === 'mes' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('viewMonth')}
            </button>
          </div>
          <button
            onClick={() => {
              const d = new Date(semanaBase)
              if (vista === 'semana') d.setDate(d.getDate() - 7)
              else d.setMonth(d.getMonth() - 1)
              setSemanaBase(d)
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => setSemanaBase(new Date())}
            className="px-4 py-1.5 text-xs font-bold text-teal-400 border border-teal-500/30 rounded-xl hover:bg-teal-500/10 transition-colors"
          >
            {t('today')}
          </button>
          <button
            onClick={() => {
              const d = new Date(semanaBase)
              if (vista === 'semana') d.setDate(d.getDate() + 7)
              else d.setMonth(d.getMonth() + 1)
              setSemanaBase(d)
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {vista === 'semana' && (
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 md:hidden scrollbar-hide">
        {semana.map((dia) => {
          const fecha = toDateStr(dia)
          const count = turnosDel(dia).length
          return (
            <button
              key={fecha}
              onClick={() => setDiaSeleccionado(fecha)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                diaSeleccionado === fecha
                  ? 'bg-teal-600 text-white'
                  : fecha === hoy
                  ? 'border border-teal-500/40 text-teal-400'
                  : 'border border-white/10 text-slate-400'
              }`}
            >
              {formatDia(dia, true)} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          )
        })}
      </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : vista === 'mes' ? (
        <>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
              <div key={d} className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 py-2">
                {dateLocale === 'en-US' ? ['mon','tue','wed','thu','fri','sat','sun'][['lun','mar','mié','jue','vie','sáb','dom'].indexOf(d)] :
                 dateLocale === 'pt-BR' ? ['seg','ter','qua','qui','sex','sáb','dom'][['lun','mar','mié','jue','vie','sáb','dom'].indexOf(d)] : d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {mes.map((dia) => {
              const fecha = toDateStr(dia)
              const turnosDia = turnosDel(dia)
              const mismoMes = dia.getMonth() === semanaBase.getMonth()
              const seleccionado = diaSeleccionado === fecha
              return (
                <button
                  key={fecha}
                  onClick={() => setDiaSeleccionado(fecha)}
                  className={`min-h-[70px] md:min-h-[90px] p-1.5 text-left rounded-lg border transition-all ${
                    seleccionado
                      ? 'bg-teal-600/20 border-teal-500'
                      : fecha === hoy
                      ? 'bg-[--bg-card] border-teal-500/40'
                      : 'bg-[--bg-card] border-white/5 hover:border-white/20'
                  } ${!mismoMes ? 'opacity-40' : ''}`}
                >
                  <p className={`text-xs font-bold ${
                    fecha === hoy ? 'text-teal-400' : mismoMes ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {dia.getDate()}
                  </p>
                  {turnosDia.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {turnosDia.slice(0, 3).map((tt) => (
                        <div
                          key={tt.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${
                            tt.estado === 'confirmado' ? 'bg-green-500/20 text-green-300' :
                            tt.estado === 'realizado' ? 'bg-slate-500/20 text-slate-400' :
                            tt.estado === 'cancelado' || tt.estado === 'ausente' ? 'bg-red-500/20 text-red-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {formatHora(tt.fecha_hora)} {tt.pacientes?.nombre?.split(' ')[0] ?? '—'}
                        </div>
                      ))}
                      {turnosDia.length > 3 && (
                        <div className="text-[10px] text-slate-500">+{turnosDia.length - 3}</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Detalle del día seleccionado en vista mensual */}
          <div className="mt-5 space-y-2">
            <h3 className="text-sm font-bold text-white">
              {(() => {
                const dia = mes.find((d) => toDateStr(d) === diaSeleccionado)
                return dia ? formatDia(dia) : diaSeleccionado
              })()}
            </h3>
            {(() => {
              const dia = mes.find((d) => toDateStr(d) === diaSeleccionado)
              if (!dia) return null
              const turnosDia = turnosDel(dia)
              if (turnosDia.length === 0) {
                return <p className="text-slate-500 text-sm py-4">{t('noAppointmentsDay')}</p>
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {turnosDia.map((tt) => (
                    <TarjetaTurno key={tt.id} turno={tt} token={token!} onChange={handleCambio} formatHora={formatHora} />
                  ))}
                </div>
              )
            })()}
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:grid grid-cols-7 gap-3">
            {diasMostrar.map((dia) => {
              const fecha = toDateStr(dia)
              const turnosDia = turnosDel(dia)
              return (
                <div key={fecha}>
                  <div className={`text-center mb-2 pb-2 border-b ${
                    fecha === hoy ? 'border-teal-500/40' : 'border-white/5'
                  }`}>
                    <p className={`text-xs font-bold uppercase tracking-widest ${
                      fecha === hoy ? 'text-teal-400' : 'text-slate-500'
                    }`}>
                      {dia.toLocaleDateString(dateLocale, { weekday: 'short' })}
                    </p>
                    <p className={`text-lg font-black ${fecha === hoy ? 'text-teal-400' : 'text-slate-300'}`}>
                      {dia.getDate()}
                    </p>
                    <p className="text-slate-600 text-xs">{t('appointmentsCount', { n: turnosDia.length })}</p>
                  </div>
                  <div className="space-y-2">
                    {turnosDia.map((tt) => (
                      <TarjetaTurno key={tt.id} turno={tt} token={token!} onChange={handleCambio} formatHora={formatHora} />
                    ))}
                    {turnosDia.length === 0 && (
                      <p className="text-slate-700 text-xs text-center py-4">{t('noAppointments')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="md:hidden">
            {(() => {
              const dia = semana.find((d) => toDateStr(d) === diaSeleccionado)
              if (!dia) return null
              const turnosDia = turnosDel(dia)
              return (
                <div className="space-y-3">
                  {turnosDia.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">{t('noAppointmentsDay')}</div>
                  ) : (
                    turnosDia.map((tt) => (
                      <TarjetaTurno key={tt.id} turno={tt} token={token!} onChange={handleCambio} formatHora={formatHora} />
                    ))
                  )}
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
