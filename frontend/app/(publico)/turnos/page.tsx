'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { getDoctores, getSlots, solicitarTurno, type Doctor, type TurnoResponse } from '@/lib/api/turnos'

/* ─── CONFIG ─── */
const tratamientos = [
  { id: 'estetica',       label: 'Estética dental',  icono: '✨', duracion: '60 min' },
  { id: 'blanqueamiento', label: 'Blanqueamiento',    icono: '🪥', duracion: '45 min' },
  { id: 'ortodoncia',     label: 'Ortodoncia',        icono: '😬', duracion: '30 min' },
  { id: 'implante',       label: 'Implante',          icono: '🦷', duracion: '90 min' },
  { id: 'limpieza',       label: 'Limpieza dental',   icono: '✅', duracion: '30 min' },
  { id: 'urgencia',       label: 'Urgencia / Dolor',  icono: '🚨', duracion: '45 min' },
  { id: 'consulta',       label: 'Consulta general',  icono: '📋', duracion: '30 min' },
]

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

function formatFechaDisplay(d: Date): string {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function toISOLocal(d: Date, hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  const dt = new Date(d)
  dt.setHours(h, m, 0, 0)
  const offset = -3 * 60
  const utc = dt.getTime() - dt.getTimezoneOffset() * 60000
  const ar = new Date(utc + offset * 60000)
  return ar.toISOString().replace('Z', '-03:00')
}

type Paso = 1 | 2 | 3 | 4 | 5

/* ─── COMPONENT ─── */
export default function TurnosPage() {
  const topRef = useRef<HTMLDivElement>(null)
  const [paso, setPaso] = useState<Paso>(1)

  // Paso 1
  const [tratamiento, setTratamiento] = useState('')
  const [loadingDoctores, setLoadingDoctores] = useState(false)

  // Paso 2 — doctor
  const [doctores, setDoctores] = useState<Doctor[]>([])
  const [doctorId, setDoctorId] = useState<string | undefined>()
  const [doctorNombre, setDoctorNombre] = useState('')
  const [mostrarSelectDoctor, setMostrarSelectDoctor] = useState(false)

  // Paso 3 — fecha y hora
  const dias = useMemo(() => proximosDiasHabiles(10), [])
  const [diaIndex, setDiaIndex] = useState(0)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [errorSlots, setErrorSlots] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')

  // Paso 4 — datos
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  // Paso 5 — confirmado
  const [turnoConfirmado, setTurnoConfirmado] = useState<TurnoResponse | null>(null)

  const tratamientoObj = tratamientos.find((t) => t.id === tratamiento)
  const diaSeleccionado = dias[diaIndex]
  const totalPasos = mostrarSelectDoctor ? 4 : 3

  function pasoVisible(): number {
    if (!mostrarSelectDoctor) {
      if (paso === 1) return 1
      if (paso === 3) return 2
      if (paso === 4) return 3
      return paso as number
    }
    return paso as number
  }

  function irAPaso(p: Paso) {
    setPaso(p)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Validar si puede retroceder/avanzar
  function puedeRetroceder(): boolean {
    return paso > 1
  }

  function puedeAvanzar(): boolean {
    if (paso === 1) return tratamiento !== ''
    if (paso === 2) return doctorId !== undefined
    if (paso === 3) return horaSeleccionada !== ''
    if (paso === 4) return nombre.trim() !== '' && telefono.trim() !== ''
    return false
  }

  // ── Paso 1 → siguiente: auto-avanza al seleccionar tratamiento ──
  async function seleccionarTratamiento(id: string) {
    setTratamiento(id)
    setLoadingDoctores(true)
    try {
      const res = await getDoctores(id)
      if (res.total === 0) {
        setDoctorId(undefined); setDoctorNombre(''); setMostrarSelectDoctor(false)
        irAPaso(3)
      } else if (res.total === 1) {
        setDoctorId(res.doctores[0].id); setDoctorNombre(res.doctores[0].nombre)
        setMostrarSelectDoctor(false)
        irAPaso(3)
      } else {
        setDoctores(res.doctores); setDoctorId(undefined); setDoctorNombre('')
        setMostrarSelectDoctor(true)
        irAPaso(2)
      }
    } catch {
      setDoctorId(undefined); setMostrarSelectDoctor(false)
      irAPaso(3)
    } finally {
      setLoadingDoctores(false)
    }
  }

  function seleccionarDoctor(doc: Doctor) {
    setDoctorId(doc.id)
    setDoctorNombre(doc.nombre)
    irAPaso(3)
  }

  function seleccionarHora(hora: string) {
    setHoraSeleccionada(hora)
    irAPaso(4)
  }

  const fetchSlots = useCallback(async () => {
    if (!tratamiento || !diaSeleccionado) return
    setLoadingSlots(true)
    setErrorSlots('')
    setHoraSeleccionada('')
    try {
      const fecha = diaSeleccionado.toISOString().split('T')[0]
      const res = await getSlots(fecha, tratamiento, doctorId)
      setSlots(res.slots)
      if (res.slots.length === 0) setErrorSlots(res.mensaje ?? 'Sin disponibilidad para este día.')
    } catch (e: unknown) {
      setErrorSlots(e instanceof Error ? e.message : 'Error al cargar horarios')
    } finally {
      setLoadingSlots(false)
    }
  }, [tratamiento, diaSeleccionado, doctorId])

  useEffect(() => {
    if (paso === 3) fetchSlots()
  }, [paso, fetchSlots])

  async function confirmarTurno() {
    if (!nombre.trim() || !telefono.trim()) return
    setEnviando(true); setErrorEnvio('')
    try {
      const fechaHora = toISOLocal(diaSeleccionado, horaSeleccionada)
      const res = await solicitarTurno({
        nombre: nombre.trim(), telefono: telefono.trim(),
        fecha_hora: fechaHora, tipo_tratamiento: tratamiento,
        notas: notas.trim() || undefined, usuario_id: doctorId,
      })
      setTurnoConfirmado(res)
      irAPaso(5)
    } catch (e: unknown) {
      setErrorEnvio(e instanceof Error ? e.message : 'Error al confirmar el turno')
    } finally {
      setEnviando(false)
    }
  }

  const pasoActual = pasoVisible()
  const esConfirmacion = paso === 5

  return (
    <div ref={topRef} className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header glass-dark */}
      <header className="glass-dark sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-teal-400 font-semibold text-sm hover:text-teal-300 transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Soluciones Dentales
          </Link>
          {!esConfirmacion && (
            <span className="text-xs text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
              Paso {pasoActual} de {totalPasos}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Barra de progreso */}
        {!esConfirmacion && (
          <div className="flex items-center gap-2 mb-10">
            {Array.from({ length: totalPasos }, (_, i) => i + 1).map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                  pasoActual > n  ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white' :
                  pasoActual === n ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white ring-4 ring-teal-400/30' :
                  'bg-white/10 text-slate-400'
                }`}>
                  {pasoActual > n
                    ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : n}
                </div>
                {n < totalPasos && (
                  <div className={`flex-1 h-1 rounded-full transition-colors ${pasoActual > n ? 'bg-gradient-to-r from-teal-500/50 to-teal-400/30' : 'bg-white/5'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contenedor con navegación manual (flechas) */}
        <div className="relative">
          {!esConfirmacion && (
            <>
              {/* Flecha izquierda */}
              <button
                onClick={() => irAPaso((paso - 1) as Paso)}
                disabled={!puedeRetroceder()}
                className="hidden md:flex absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-teal-500/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center transition-all text-teal-400 hover:text-teal-300"
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Flecha derecha */}
              <button
                onClick={() => irAPaso((paso + 1) as Paso)}
                disabled={!puedeAvanzar()}
                className="hidden md:flex absolute -right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-teal-500/20 disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center transition-all text-teal-400 hover:text-teal-300"
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* ── PASO 1: Tratamiento ── */}
          {paso === 1 && (
            <div>
              <h1 className="text-3xl font-black text-white mb-1">¿Qué tratamiento necesitás?</h1>
              <p className="text-slate-400 text-sm mb-6">Tocá uno para continuar</p>

              {loadingDoctores ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {tratamientos.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl glass border border-white/10 opacity-50">
                      <div className="text-3xl mb-2">{t.icono}</div>
                      <p className="font-semibold text-white text-sm leading-tight">{t.label}</p>
                      <p className="text-slate-500 text-xs mt-1">⏱ {t.duracion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {tratamientos.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => seleccionarTratamiento(t.id)}
                      className={`p-4 rounded-2xl transition-all active:scale-95 ${
                        tratamiento === t.id
                          ? 'glass card-teal-hover border-teal-400 bg-teal-500/20'
                          : 'glass border-white/10 hover:border-teal-400/50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{t.icono}</div>
                      <p className="font-semibold text-white text-sm leading-tight">{t.label}</p>
                      <p className="text-slate-500 text-xs mt-1">⏱ {t.duracion}</p>
                      {tratamiento === t.id && (
                        <div className="mt-2 flex items-center gap-1 text-teal-400 text-xs font-bold">
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                          Seleccionado
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {loadingDoctores && (
                <div className="flex items-center justify-center gap-2 mt-6 text-teal-400 text-sm">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Buscando disponibilidad...
                </div>
              )}
            </div>
          )}

          {/* ── PASO 2: Doctor ── */}
          {paso === 2 && (
            <div>
              <h1 className="text-3xl font-black text-white mb-1">Elegí tu odontólogo</h1>
              <p className="text-slate-400 text-sm mb-6">
                {tratamientoObj?.icono} {tratamientoObj?.label}
              </p>

              <div className="space-y-3">
                {doctores.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => seleccionarDoctor(doc)}
                    className={`w-full p-4 rounded-2xl transition-all active:scale-[0.98] ${
                      doctorId === doc.id
                        ? 'glass card-teal-hover border-teal-400 bg-teal-500/20'
                        : 'glass border-white/10 hover:border-teal-400/50'
                    } flex items-center gap-4`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-lg font-bold flex-shrink-0 text-white">
                      {doc.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white">{doc.nombre}</p>
                      <p className="text-teal-400 text-sm">{tratamientoObj?.label} · {tratamientoObj?.duracion}</p>
                    </div>
                    {doctorId === doc.id && (
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-teal-400 flex-shrink-0">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 3: Fecha y hora ── */}
          {paso === 3 && (
            <div>
              <h1 className="text-3xl font-black text-white mb-1">Elegí fecha y hora</h1>
              <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-slate-400">
                <span>{tratamientoObj?.icono} {tratamientoObj?.label}</span>
                {doctorNombre && (
                  <span className="text-teal-400 font-medium">· 👨‍⚕️ {doctorNombre}</span>
                )}
              </div>

              {/* Días — scroll horizontal */}
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Día</p>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
                {dias.map((dia, i) => (
                  <button
                    key={i}
                    onClick={() => setDiaIndex(i)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-full border font-medium text-sm transition-all ${
                      diaIndex === i
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-400'
                        : 'glass border-white/10 text-slate-400 hover:border-teal-400/50'
                    }`}
                  >
                    {formatFechaDisplay(dia)}
                  </button>
                ))}
              </div>

              {/* Horarios */}
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Horario <span className="text-teal-400 normal-case font-normal">(tocá uno para continuar)</span>
              </p>
              {loadingSlots ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 bg-white/10 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : errorSlots ? (
                <div className="glass border border-amber-500/20 bg-amber-500/10 rounded-2xl px-4 py-3 text-amber-300 text-sm flex items-center gap-2">
                  <span>⚠️</span> {errorSlots}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {slots.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => seleccionarHora(hora)}
                      className={`py-3 rounded-xl border font-semibold text-sm transition-all active:scale-95 ${
                        horaSeleccionada === hora
                          ? 'glass card-teal-hover border-teal-400 bg-teal-500/20 text-white'
                          : 'glass border-white/10 text-slate-400 hover:border-teal-400/50'
                      }`}
                    >
                      {hora}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PASO 4: Datos personales ── */}
          {paso === 4 && (
            <div>
              <h1 className="text-3xl font-black text-white mb-1">Tus datos</h1>
              <p className="text-slate-400 text-sm mb-6">Sin registro — solo nombre y teléfono</p>

              {/* Resumen compacto */}
              <div className="glass border border-teal-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-teal-300 font-bold text-sm">
                    {tratamientoObj?.icono} {tratamientoObj?.label}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {formatFechaDisplay(diaSeleccionado)} · {horaSeleccionada}
                    {doctorNombre && ` · ${doctorNombre}`}
                  </p>
                </div>
                <button
                  onClick={() => irAPaso(3)}
                  className="text-teal-400 text-xs font-bold hover:text-teal-300 transition-colors flex-shrink-0 ml-2"
                >
                  Cambiar
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Nombre completo *</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: María García"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Teléfono *</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 11 1234-5678"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                  />
                  <p className="text-slate-500 text-xs mt-1.5">Te avisamos por WhatsApp cuando se confirme</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Notas <span className="font-normal text-slate-500">(opcional)</span>
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Alergias, derivaciones, cualquier dato útil..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 resize-none transition-all"
                  />
                </div>
              </div>

              {errorEnvio && (
                <div className="mt-4 glass border border-red-500/20 bg-red-500/10 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                  <span>❌</span> {errorEnvio}
                </div>
              )}

              <button
                disabled={!nombre.trim() || !telefono.trim() || enviando}
                onClick={confirmarTurno}
                className="w-full mt-6 bg-gradient-to-r from-teal-500 to-teal-400 text-white py-4 rounded-2xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:from-teal-400 hover:to-teal-300 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 text-base"
              >
                {enviando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Confirmando...
                  </>
                ) : 'Confirmar turno ✓'}
              </button>

              <p className="text-center text-slate-500 text-xs mt-3">
                Tu información es confidencial y no será compartida con terceros.
              </p>
            </div>
          )}

          {/* ── PASO 5: Confirmación ── */}
          {paso === 5 && turnoConfirmado && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✅</span>
              </div>
              <h1 className="text-3xl font-black text-white mb-2">¡Turno solicitado!</h1>
              <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                Te vamos a contactar al{' '}
                <span className="font-semibold text-teal-400">{telefono}</span>{' '}
                para confirmar. Revisá WhatsApp.
              </p>

              <div className="glass border border-teal-500/20 rounded-2xl p-5 text-left mb-6 max-w-xs mx-auto">
                <p className="font-bold text-teal-300 text-sm mb-3">Resumen del turno</p>
                <div className="space-y-1.5 text-sm text-slate-400">
                  <p>👤 <span className="text-white">{nombre}</span></p>
                  <p>{tratamientoObj?.icono} <span className="text-white">{tratamientoObj?.label}</span></p>
                  {doctorNombre && <p>👨‍⚕️ <span className="text-white">{doctorNombre}</span></p>}
                  <p>📅 <span className="text-white">{formatFechaDisplay(diaSeleccionado)} a las {horaSeleccionada}</span></p>
                  <p>📱 <span className="text-white">{telefono}</span></p>
                  <p className="text-slate-600 text-xs pt-1">Ref. #{turnoConfirmado.turno_id}</p>
                </div>
              </div>

              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER ?? '5491100000000'}?text=${encodeURIComponent(
                  `Hola! Acabo de solicitar un turno de ${tratamientoObj?.label} para el ${formatFechaDisplay(diaSeleccionado)} a las ${horaSeleccionada}. Mi nombre es ${nombre}.`
                )}`}
                target="_blank"
                className="block max-w-xs mx-auto bg-green-500 text-white py-3.5 rounded-full font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 mb-3"
              >
                💬 Confirmar por WhatsApp
              </a>
              <Link
                href="/mis-turnos"
                className="block max-w-xs mx-auto glass border border-teal-500/30 text-teal-400 hover:border-teal-400 hover:bg-teal-500/10 py-3 rounded-full font-bold transition-all mb-3 text-sm"
              >
                📋 Ver mis turnos
              </Link>
              <Link href="/" className="block text-slate-500 text-sm hover:text-slate-400 transition-colors">
                Volver al inicio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
