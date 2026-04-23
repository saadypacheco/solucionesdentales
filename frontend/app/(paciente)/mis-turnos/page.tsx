'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { usePacienteStore } from '@/store/pacienteStore'
import {
  enviarOTP, verificarOTP, getMisTurnos, cancelarTurno,
  descargarMisDatos, eliminarMiCuenta,
  type MiTurno,
} from '@/lib/api/paciente'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

const estadoBadge: Record<string, string> = {
  solicitado:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmado:  'bg-green-100 text-green-700 border-green-200',
  realizado:   'bg-slate-100 text-slate-500 border-slate-200',
  cancelado:   'bg-red-100 text-red-500 border-red-200',
  ausente:     'bg-orange-100 text-orange-600 border-orange-200',
}

/* ─── PASO TELÉFONO ─── */
function PasoTelefono({ onEnviado }: {
  onEnviado: (tel: string, waLink: string, codigoDev: string | null, nombre: string | null) => void
}) {
  const t = useTranslations('misTurnos.pasoTelefono')
  const tTitle = useTranslations('misTurnos')
  const [telefono, setTelefono] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!telefono.trim()) return
    setCargando(true); setError('')
    try {
      const res = await enviarOTP(telefono.trim())
      onEnviado(telefono.trim(), res.wa_link, res.codigo_dev, res.nombre)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorSend'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">{tTitle('title')}</h1>
        <p className="text-slate-500 text-sm">
          {t('hint')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t('title')}
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder={t('placeholder')}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-slate-800 transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!telefono.trim() || cargando}
          className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 hover:bg-teal-700 transition-colors"
        >
          {cargando ? t('sending') : `${t('send')} →`}
        </button>
      </form>
    </div>
  )
}

/* ─── PASO OTP ─── */
function PasoOTP({ telefono, waLink, codigoDev, nombre, onVerificado, onVolver }: {
  telefono: string
  waLink: string
  codigoDev: string | null
  nombre: string | null
  onVerificado: (token: string, paciente: { id: number; nombre: string; telefono: string }) => void
  onVolver: () => void
}) {
  const t = useTranslations('misTurnos.pasoOTP')
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (codigo.length !== 4) return
    setCargando(true); setError('')
    try {
      const res = await verificarOTP(telefono, codigo)
      onVerificado(res.access_token, res.paciente)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorCode'))
      setCodigo('')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">
          {nombre ? t('greeting', { nombre: nombre.split(' ')[0] }) : t('title')}
        </h1>
        <p className="text-slate-500 text-sm">{t('subtitle', { telefono })}</p>
      </div>

      <a
        href={waLink}
        target="_blank"
        className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl mb-5 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.25.626 4.35 1.714 6.126L.057 23.882l5.9-1.548A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.504.92.936-3.41-.234-.37A9.818 9.818 0 112 12c0-5.422 4.396-9.818 9.818-9.818S21.636 6.578 21.636 12 17.24 21.818 12 21.818z"/>
        </svg>
        {t('openWhatsApp')}
      </a>

      {codigoDev && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-xs text-amber-600 font-medium mb-1">
            {t('devModeLabel')}
          </p>
          <p className="text-3xl font-black text-amber-700 tracking-widest">{codigoDev}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t('label')}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('placeholder')}
            autoFocus
            className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-slate-800 text-center text-2xl font-black tracking-widest transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={codigo.length !== 4 || cargando}
          className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 hover:bg-teal-700 transition-colors"
        >
          {cargando ? t('verifying') : `${t('verify')} →`}
        </button>
      </form>

      <button
        onClick={onVolver}
        className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors w-full text-center"
      >
        {t('changePhone')}
      </button>
    </div>
  )
}

/* ─── PANEL ARCO (derechos del paciente) ─── */
function PanelARCO({ token, onCuentaEliminada }: {
  token: string
  onCuentaEliminada: () => void
}) {
  const t = useTranslations('arco')
  const [descargando, setDescargando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  async function handleDescargar() {
    setDescargando(true); setError('')
    try {
      const datos = await descargarMisDatos(token)
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mis-datos-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('download.errorDownload'))
    } finally {
      setDescargando(false)
    }
  }

  async function handleEliminar() {
    if (!confirm(t('delete.confirm1'))) return
    if (!confirm(t('delete.confirm2'))) return
    setEliminando(true); setError('')
    try {
      await eliminarMiCuenta(token)
      setExito(true)
      setTimeout(() => onCuentaEliminada(), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('delete.errorDelete'))
      setEliminando(false)
    }
  }

  if (exito) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">✓</div>
        <h3 className="font-black text-green-800 mb-1">{t('delete.successTitle')}</h3>
        <p className="text-green-700 text-sm">{t('delete.successMessage')}</p>
      </div>
    )
  }

  return (
    <details className="bg-white border border-slate-100 rounded-2xl p-4 mt-6 group">
      <summary className="cursor-pointer font-semibold text-slate-700 text-sm flex items-center justify-between list-none">
        <span>🛡️ {t('title')}</span>
        <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <p className="text-slate-500 text-xs mt-1 mb-4">{t('subtitle')}</p>

      <div className="space-y-3">
        {/* Descargar */}
        <div className="border border-slate-100 rounded-xl p-3">
          <p className="font-bold text-slate-700 text-sm">{t('download.title')}</p>
          <p className="text-slate-500 text-xs mt-1 mb-3">{t('download.description')}</p>
          <button
            onClick={handleDescargar}
            disabled={descargando}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg disabled:opacity-50"
          >
            {descargando ? t('download.downloading') : `📥 ${t('download.button')}`}
          </button>
        </div>

        {/* Eliminar */}
        <div className="border border-red-100 rounded-xl p-3">
          <p className="font-bold text-red-700 text-sm">{t('delete.title')}</p>
          <p className="text-slate-500 text-xs mt-1 mb-3">{t('delete.description')}</p>
          <button
            onClick={handleEliminar}
            disabled={eliminando}
            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-2 rounded-lg disabled:opacity-50 border border-red-200"
          >
            {eliminando ? t('delete.deleting') : `🗑️ ${t('delete.button')}`}
          </button>
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}
      </div>
    </details>
  )
}

/* ─── LISTA TURNOS ─── */
function MisTurnosLista({ token, nombre, onLogout }: {
  token: string
  nombre: string
  onLogout: () => void
}) {
  const t = useTranslations('misTurnos.pasoTurnos')
  const tEstados = useTranslations('estadosTurno.labels')
  const tEstadosShort = useTranslations('estadosTurno')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const router = useRouter()

  const [turnos, setTurnos] = useState<MiTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState<number | null>(null)

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  function formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
  }

  useEffect(() => {
    getMisTurnos(token).then(setTurnos).finally(() => setLoading(false))
  }, [token])

  async function handleCancelar(id: number) {
    if (!confirm(t('confirmCancel'))) return
    setCancelando(id)
    try {
      await cancelarTurno(token, id)
      setTurnos((prev) => prev.map((tt) => tt.id === id ? { ...tt, estado: 'cancelado' } : tt))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('errorCancel'))
    } finally {
      setCancelando(null)
    }
  }

  const proximos = turnos.filter((tt) =>
    tt.estado !== 'cancelado' && new Date(tt.fecha_hora) >= new Date()
  )
  const pasados = turnos.filter((tt) =>
    tt.estado === 'realizado' || (tt.estado !== 'cancelado' && new Date(tt.fecha_hora) < new Date())
  )

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-slate-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            {t('greeting', { nombre: nombre.split(' ')[0] })}
          </h1>
          <p className="text-slate-400 text-sm">
            {t('subtitle')}
          </p>
        </div>
        <button onClick={onLogout} className="text-slate-400 text-xs hover:text-slate-600 transition-colors">
          {t('logout')}
        </button>
      </div>

      {turnos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500 mb-4">{t('noTurnos')}</p>
          <Link
            href="/turnos"
            className="inline-block bg-teal-600 text-white font-bold px-6 py-3 rounded-full hover:bg-teal-700 transition-colors"
          >
            {t('bookNew')}
          </Link>
        </div>
      ) : (
        <>
          {proximos.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                {t('upcoming')}
              </p>
              <div className="space-y-3">
                {proximos.map((tt) => (
                  <div key={tt.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-slate-800 capitalize">{tt.tipo_tratamiento}</p>
                        <p className="text-teal-600 text-sm font-medium">{formatFecha(tt.fecha_hora)}</p>
                        <p className="text-slate-500 text-sm">{formatHora(tt.fecha_hora)} · {tt.duracion_minutos} min</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${estadoBadge[tt.estado] ?? ''}`}>
                        {tEstadosShort(tt.estado)}
                      </span>
                    </div>

                    {tt.notas && (
                      <p className="text-slate-400 text-xs mt-2 bg-slate-50 rounded-lg px-3 py-2">
                        📝 {tt.notas}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-xs text-slate-400">{tEstados(tt.estado)}</p>
                      {(tt.estado === 'solicitado' || tt.estado === 'confirmado') && (
                        <button
                          onClick={() => handleCancelar(tt.id)}
                          disabled={cancelando === tt.id}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {cancelando === tt.id ? t('canceling') : t('cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pasados.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                {t('history')}
              </p>
              <div className="space-y-2">
                {pasados.map((tt) => (
                  <div key={tt.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 capitalize">{tt.tipo_tratamiento}</p>
                      <p className="text-slate-400 text-xs">{formatFecha(tt.fecha_hora)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${estadoBadge[tt.estado] ?? ''}`}>
                      {tEstadosShort(tt.estado)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/turnos"
            className="mt-6 flex items-center justify-center gap-2 w-full bg-teal-600 text-white font-bold py-3.5 rounded-full hover:bg-teal-700 transition-colors shadow-md shadow-teal-100"
          >
            + {t('bookAnother')}
          </Link>
        </>
      )}

      {/* Panel de derechos ARCO */}
      <PanelARCO
        token={token}
        onCuentaEliminada={() => {
          onLogout()
          router.push('/')
        }}
      />
    </div>
  )
}

/* ─── PAGE ─── */
export default function MisTurnosPage() {
  const tTitle = useTranslations('misTurnos')
  const tNavbar = useTranslations('navbar')
  const { token, paciente, setAuth, logout } = usePacienteStore()
  const [paso, setPaso] = useState<'telefono' | 'otp' | 'turnos'>(
    token ? 'turnos' : 'telefono'
  )
  const [telefono, setTelefono] = useState('')
  const [waLink, setWaLink] = useState('')
  const [codigoDev, setCodigoDev] = useState<string | null>(null)
  const [nombreOTP, setNombreOTP] = useState<string | null>(null)

  function handleEnviado(tel: string, link: string, cod: string | null, nombre: string | null) {
    setTelefono(tel)
    setWaLink(link)
    setCodigoDev(cod)
    setNombreOTP(nombre)
    setPaso('otp')
  }

  function handleVerificado(tok: string, p: { id: number; nombre: string; telefono: string }) {
    setAuth(tok, p)
    setPaso('turnos')
  }

  function handleLogout() {
    logout()
    setPaso('telefono')
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
      <header className="bg-slate-950 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-teal-400 font-semibold text-sm hover:text-teal-300 transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {tNavbar('back')}
          </Link>
          <div className="flex items-center gap-4">
            {paso === 'turnos' && (
              <span className="text-xs text-teal-400 font-bold bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30">
                {tTitle('verifiedBadge')}
              </span>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {paso === 'telefono' && (
          <PasoTelefono onEnviado={handleEnviado} />
        )}
        {paso === 'otp' && (
          <PasoOTP
            telefono={telefono}
            waLink={waLink}
            codigoDev={codigoDev}
            nombre={nombreOTP}
            onVerificado={handleVerificado}
            onVolver={() => setPaso('telefono')}
          />
        )}
        {paso === 'turnos' && token && paciente && (
          <MisTurnosLista token={token} nombre={paciente.nombre} onLogout={handleLogout} />
        )}
      </div>
    </div>
  )
}
