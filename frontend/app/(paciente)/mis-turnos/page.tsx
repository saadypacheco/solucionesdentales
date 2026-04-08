'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePacienteStore } from '@/store/pacienteStore'
import { enviarOTP, verificarOTP, getMisTurnos, cancelarTurno, type MiTurno } from '@/lib/api/paciente'
import { useLangStore } from '@/store/langStore'
import { useT } from '@/lib/i18n'

/* ─── HELPERS ─── */
function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const estadoBadge: Record<string, string> = {
  solicitado:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmado:  'bg-green-100 text-green-700 border-green-200',
  realizado:   'bg-slate-100 text-slate-500 border-slate-200',
  cancelado:   'bg-red-100 text-red-500 border-red-200',
  ausente:     'bg-orange-100 text-orange-600 border-orange-200',
}

const estadoLabel: Record<string, string> = {
  solicitado:  'Solicitado — pendiente de confirmación',
  confirmado:  'Confirmado ✓',
  realizado:   'Realizado',
  cancelado:   'Cancelado',
  ausente:     'No asistió',
}

/* ─── VISTA: Formulario teléfono ─── */
function PasoTelefono({ onEnviado }: {
  onEnviado: (tel: string, waLink: string, codigoDev: string | null, nombre: string | null) => void
}) {
  const t = useT()
  const { lang } = useLangStore()
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
      setError(e instanceof Error ? e.message : (lang === 'es' ? 'Error al enviar código' : 'Error sending code'))
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
        <h1 className="text-2xl font-black text-slate-800 mb-2">{t.misTurnos.title}</h1>
        <p className="text-slate-500 text-sm">
          {t.misTurnos.pasoTelefono.hint}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t.misTurnos.pasoTelefono.title}
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder={t.misTurnos.pasoTelefono.placeholder}
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
          {cargando ? t.misTurnos.pasoTelefono.sending : `${t.misTurnos.pasoTelefono.send} →`}
        </button>
      </form>
    </div>
  )
}

/* ─── VISTA: Ingresar código OTP ─── */
function PasoOTP({ telefono, waLink, codigoDev, nombre, onVerificado, onVolver }: {
  telefono: string
  waLink: string
  codigoDev: string | null
  nombre: string | null
  onVerificado: (token: string, paciente: { id: number; nombre: string; telefono: string }) => void
  onVolver: () => void
}) {
  const t = useT()
  const { lang } = useLangStore()
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
      setError(e instanceof Error ? e.message : (lang === 'es' ? 'Código incorrecto' : 'Incorrect code'))
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
          {nombre
            ? lang === 'es'
              ? `Hola, ${nombre.split(' ')[0]}!`
              : `Hi, ${nombre.split(' ')[0]}!`
            : lang === 'es'
            ? 'Verificar identidad'
            : 'Verify identity'}
        </h1>
        <p className="text-slate-500 text-sm">
          {lang === 'es'
            ? `Te enviamos un código de 4 dígitos al `
            : `We sent a 4-digit code to `}
          <span className="font-semibold text-slate-700">{telefono}</span>.
        </p>
      </div>

      {/* Botón WhatsApp para recibir el código */}
      <a
        href={waLink}
        target="_blank"
        className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl mb-5 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.25.626 4.35 1.714 6.126L.057 23.882l5.9-1.548A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.504.92.936-3.41-.234-.37A9.818 9.818 0 112 12c0-5.422 4.396-9.818 9.818-9.818S21.636 6.578 21.636 12 17.24 21.818 12 21.818z"/>
        </svg>
        {t.misTurnos.pasoOTP.hint}
      </a>

      {/* En desarrollo, mostramos el código directamente */}
      {codigoDev && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-xs text-amber-600 font-medium mb-1">
            {lang === 'es' ? 'Modo desarrollo — código:' : 'Development mode — code:'}
          </p>
          <p className="text-3xl font-black text-amber-700 tracking-widest">{codigoDev}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t.misTurnos.pasoOTP.title}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={t.misTurnos.pasoOTP.placeholder}
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
          {cargando ? t.misTurnos.pasoOTP.verifying : `${t.misTurnos.pasoOTP.verify} →`}
        </button>
      </form>

      <button
        onClick={onVolver}
        className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors w-full text-center"
      >
        ← {lang === 'es' ? 'Cambiar teléfono' : 'Change phone'}
      </button>
    </div>
  )
}

/* ─── VISTA: Lista de turnos ─── */
function MisTurnosLista({ token, nombre, onLogout }: {
  token: string
  nombre: string
  onLogout: () => void
}) {
  const t = useT()
  const { lang } = useLangStore()
  const [turnos, setTurnos] = useState<MiTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState<number | null>(null)

  useEffect(() => {
    getMisTurnos(token).then(setTurnos).finally(() => setLoading(false))
  }, [token])

  async function handleCancelar(id: number) {
    if (!confirm(lang === 'es' ? '¿Seguro que querés cancelar este turno?' : 'Are you sure you want to cancel this appointment?')) return
    setCancelando(id)
    try {
      await cancelarTurno(token, id)
      setTurnos((prev) => prev.map((t) => t.id === id ? { ...t, estado: 'cancelado' } : t))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : (lang === 'es' ? 'No se pudo cancelar' : 'Could not cancel'))
    } finally {
      setCancelando(null)
    }
  }

  const proximos = turnos.filter((t) =>
    t.estado !== 'cancelado' && new Date(t.fecha_hora) >= new Date()
  )
  const pasados = turnos.filter((t) =>
    t.estado === 'realizado' || (t.estado !== 'cancelado' && new Date(t.fecha_hora) < new Date())
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            {lang === 'es' ? 'Hola' : 'Hi'}, {nombre.split(' ')[0]}
          </h1>
          <p className="text-slate-400 text-sm">
            {lang === 'es' ? 'Tus turnos en Soluciones Dentales' : 'Your appointments at Dental Solutions'}
          </p>
        </div>
        <button onClick={onLogout} className="text-slate-400 text-xs hover:text-slate-600 transition-colors">
          {t.misTurnos.pasoTurnos.logout}
        </button>
      </div>

      {turnos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500 mb-4">{t.misTurnos.pasoTurnos.noTurnos}</p>
          <Link
            href="/turnos"
            className="inline-block bg-teal-600 text-white font-bold px-6 py-3 rounded-full hover:bg-teal-700 transition-colors"
          >
            {t.misTurnos.pasoTurnos.bookNew}
          </Link>
        </div>
      ) : (
        <>
          {/* Próximos turnos */}
          {proximos.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                {lang === 'es' ? 'Próximos turnos' : 'Upcoming appointments'}
              </p>
              <div className="space-y-3">
                {proximos.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-slate-800 capitalize">{t.tipo_tratamiento}</p>
                        <p className="text-teal-600 text-sm font-medium">{formatFecha(t.fecha_hora)}</p>
                        <p className="text-slate-500 text-sm">{formatHora(t.fecha_hora)} · {t.duracion_minutos} min</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${estadoBadge[t.estado] ?? ''}`}>
                        {t.estado}
                      </span>
                    </div>

                    {t.notas && (
                      <p className="text-slate-400 text-xs mt-2 bg-slate-50 rounded-lg px-3 py-2">
                        📝 {t.notas}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-xs text-slate-400">{estadoLabel[t.estado]}</p>
                      {(t.estado === 'solicitado' || t.estado === 'confirmado') && (
                        <button
                          onClick={() => handleCancelar(t.id)}
                          disabled={cancelando === t.id}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {cancelando === t.id ? 'Cancelando...' : t.misTurnos.pasoTurnos.cancel}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          {pasados.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                {lang === 'es' ? 'Historial' : 'History'}
              </p>
              <div className="space-y-2">
                {pasados.map((t) => (
                  <div key={t.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 capitalize">{t.tipo_tratamiento}</p>
                      <p className="text-slate-400 text-xs">{formatFecha(t.fecha_hora)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${estadoBadge[t.estado] ?? ''}`}>
                      {t.estado}
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
            + {lang === 'es' ? 'Agendar nuevo turno' : 'Book another appointment'}
          </Link>
        </>
      )}
    </div>
  )
}

/* ─── PAGE ─── */
export default function MisTurnosPage() {
  const t = useT()
  const { lang, setLang } = useLangStore()
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
            {t.landing.title}
          </Link>
          <div className="flex items-center gap-4">
            {paso === 'turnos' && (
              <span className="text-xs text-teal-400 font-bold bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30">
                {lang === 'es' ? 'Verificado ✓' : 'Verified ✓'}
              </span>
            )}
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
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
