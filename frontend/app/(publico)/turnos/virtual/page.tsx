'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import {
  getOdontologosVirtual,
  crearTurnoVirtual,
  subirComprobante,
  type OdontologoVirtual,
  type TurnoVirtualResponse,
} from '@/lib/api/telemedicina'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type Paso = 1 | 2 | 3 | 4 | 5

function proximosDiasHabiles(n: number): Date[] {
  const dias: Date[] = []
  const c = new Date()
  c.setHours(0, 0, 0, 0)
  c.setDate(c.getDate() + 1)
  while (dias.length < n) {
    if (c.getDay() !== 0) dias.push(new Date(c))
    c.setDate(c.getDate() + 1)
  }
  return dias
}

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

function toISOLocal(d: Date, hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  const dt = new Date(d)
  dt.setHours(h, m, 0, 0)
  return dt.toISOString()
}

const HORARIOS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

export default function TurnosVirtualPage() {
  const t = useTranslations('telemedicina')
  const tNavbar = useTranslations('navbar')
  const tCommon = useTranslations('common')
  const tPrivacidad = useTranslations('privacidad.consent')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)

  const [paso, setPaso] = useState<Paso>(1)
  const [odontologos, setOdontologos] = useState<OdontologoVirtual[]>([])
  const [loadingOd, setLoadingOd] = useState(true)

  // Form
  const [esPrimera, setEsPrimera] = useState(true)
  const [odontologoId, setOdontologoId] = useState('')
  const dias = useMemo(() => proximosDiasHabiles(10), [])
  const [diaIndex, setDiaIndex] = useState(0)
  const [hora, setHora] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [acepta, setAcepta] = useState(false)

  // Resultado
  const [turno, setTurno] = useState<TurnoVirtualResponse | null>(null)
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [comprobanteOk, setComprobanteOk] = useState(false)

  useEffect(() => {
    getOdontologosVirtual().then(setOdontologos).finally(() => setLoadingOd(false))
  }, [])

  const odontologo = odontologos.find((o) => o.id === odontologoId)
  const precio = odontologo
    ? esPrimera ? odontologo.precio_primera_consulta : odontologo.precio_seguimiento
    : null

  function fmtDia(d: Date): string {
    return d.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })
  }

  async function confirmarTurno() {
    if (!nombre.trim() || !acepta) return
    if (!telefono.trim() && !email.trim()) return
    setEnviando(true); setError('')
    try {
      const fechaHora = toISOLocal(dias[diaIndex], hora)
      const res = await crearTurnoVirtual({
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        fecha_hora: fechaHora,
        odontologo_id: odontologoId,
        es_primera_consulta: esPrimera,
        notas: notas.trim() || undefined,
        consentimiento_aceptado: true,
      })
      setTurno(res)
      setPaso(4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear turno')
    } finally {
      setEnviando(false)
    }
  }

  async function enviarComprobante() {
    if (!turno || !comprobante) return
    setEnviando(true); setError('')
    try {
      await subirComprobante(turno.turno_id, comprobante)
      setComprobanteOk(true)
      setPaso(5)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('pasoPago.submitting'))
    } finally {
      setEnviando(false)
    }
  }

  if (loadingOd) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400" style={{ background: 'var(--bg-base)' }}>
        {tCommon('loading')}
      </div>
    )
  }

  if (odontologos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--bg-base)' }}>
        <p className="text-4xl mb-4">📹</p>
        <p className="text-white text-lg font-bold mb-2">{t('pagina.title')}</p>
        <p className="text-slate-400 mb-6">{t('pagina.noOdontologos')}</p>
        <Link href="/turnos" className="text-teal-400 hover:text-teal-300">← {tNavbar('back')}</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
      <header className="sticky top-0 z-40 bg-slate-950 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/turnos" className="flex items-center gap-2 text-teal-400 font-semibold text-sm hover:text-teal-300">
            ← {tNavbar('back')}
          </Link>
          <span className="text-xs text-teal-400 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30">
            📹 {t('modoVirtual')}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">{t('pagina.title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('pagina.subtitle')}</p>
        </div>

        {/* PASO 1: Tipo de consulta */}
        {paso === 1 && (
          <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">{t('pasoTipo.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => { setEsPrimera(true); setPaso(2) }}
                className="p-5 border-2 border-white/10 hover:border-teal-400 rounded-xl text-left transition-colors"
              >
                <p className="text-3xl mb-2">🆕</p>
                <p className="font-bold text-white">{t('primeraConsulta')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('pasoTipo.primeraDesc')}</p>
              </button>
              <button
                onClick={() => { setEsPrimera(false); setPaso(2) }}
                className="p-5 border-2 border-white/10 hover:border-teal-400 rounded-xl text-left transition-colors"
              >
                <p className="text-3xl mb-2">🔁</p>
                <p className="font-bold text-white">{t('seguimiento')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('pasoTipo.seguimientoDesc')}</p>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Odontólogo + fecha + hora */}
        {paso === 2 && (
          <div className="space-y-5">
            <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-white">{t('pasoOdontologo.title')}</h2>
              <div className="space-y-2">
                {odontologos.map((o) => {
                  const p = esPrimera ? o.precio_primera_consulta : o.precio_seguimiento
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOdontologoId(o.id)}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-colors flex items-center justify-between ${
                        odontologoId === o.id ? 'border-teal-500 bg-teal-500/10' : 'border-white/10 hover:border-teal-400'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white">{o.nombre}</p>
                        {o.especialidades.length > 0 && (
                          <p className="text-xs text-slate-500">{o.especialidades.join(' · ')}</p>
                        )}
                      </div>
                      <span className="text-teal-400 font-bold text-sm">{o.moneda} {p}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {odontologoId && (
              <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-white">📅 Día y hora</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dias.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setDiaIndex(i)}
                      className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold border-2 ${
                        diaIndex === i ? 'bg-teal-600 border-teal-600 text-white' : 'border-white/10 text-slate-400 hover:border-teal-400'
                      }`}
                    >
                      {fmtDia(d)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {HORARIOS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHora(h)}
                      className={`py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                        hora === h ? 'bg-teal-600 border-teal-600 text-white' : 'border-white/10 text-slate-400 hover:border-teal-400'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPaso(3)}
                  disabled={!hora}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold disabled:opacity-40"
                >
                  {tCommon('next')} →
                </button>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Datos del paciente */}
        {paso === 3 && (
          <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">{t('pasoDatos.title')}</h2>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre completo *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-teal-500"
              />
            </div>
            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer ${acepta ? 'border-teal-500 bg-teal-500/5' : 'border-white/10'}`}>
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="w-5 h-5 mt-0.5 rounded" />
              <span className="text-sm text-slate-300">
                {tPrivacidad('checkbox', { linkPolitica: '|L|' }).split('|L|').map((p, i, arr) => (
                  <span key={i}>{p}{i < arr.length - 1 && (<Link href="/privacidad" target="_blank" className="text-teal-400 underline">{tPrivacidad('linkText')}</Link>)}</span>
                ))}
              </span>
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={confirmarTurno}
              disabled={!nombre.trim() || (!telefono.trim() && !email.trim()) || !acepta || enviando}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold disabled:opacity-40"
            >
              {enviando ? tCommon('confirming') : `Continuar al pago →`}
            </button>
          </div>
        )}

        {/* PASO 4: Pago */}
        {paso === 4 && turno && (
          <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">{t('pasoPago.title')}</h2>
              <p className="text-teal-400 font-bold text-2xl mt-2">
                {t('pasoPago.subtitle', { moneda: turno.moneda, precio: turno.precio })}
              </p>
              <p className="text-slate-400 text-sm mt-1">{t('pasoPago.instrucciones')}</p>
            </div>

            {turno.qr_pago_url ? (
              <div className="text-center py-4">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">{t('pasoPago.qrTitle')}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={turno.qr_pago_url} alt="QR de pago" className="mx-auto max-w-[240px] rounded-xl bg-white p-4" />
              </div>
            ) : (
              <p className="text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                {t('pasoPago.noConfigurado')}
              </p>
            )}

            {turno.datos_transferencia && (
              <div className="bg-slate-900 rounded-xl p-4">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">{t('pasoPago.datosTitle')}</p>
                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">{turno.datos_transferencia}</pre>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('pasoPago.uploadComprobante')}</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:font-bold hover:file:bg-teal-500"
              />
              <p className="text-xs text-slate-600 mt-1">{t('pasoPago.uploadHint')}</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={enviarComprobante}
              disabled={!comprobante || enviando}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold disabled:opacity-40"
            >
              {enviando ? t('pasoPago.submitting') : t('pasoPago.submit')}
            </button>
          </div>
        )}

        {/* PASO 5: Éxito */}
        {paso === 5 && comprobanteOk && (
          <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-8 text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-2xl font-black text-white">{t('pasoExito.title')}</h2>
            <p className="text-slate-400">{t('pasoExito.subtitle')}</p>
            <Link href="/mis-turnos" className="inline-block bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-full font-bold">
              {t('pasoExito.verMisTurnos')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
