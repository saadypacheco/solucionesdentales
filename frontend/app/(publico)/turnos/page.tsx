'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getSlots, solicitarTurno, type TurnoResponse } from '@/lib/api/turnos'

/* ─── CONFIG ───────────────────────────────────────────── */
const tratamientos = [
  { id: 'estetica',      label: 'Estética dental',  icono: '✨', duracion: '60 min' },
  { id: 'blanqueamiento',label: 'Blanqueamiento',   icono: '🪥', duracion: '45 min' },
  { id: 'ortodoncia',    label: 'Ortodoncia',        icono: '😬', duracion: '30 min' },
  { id: 'implante',      label: 'Implante',          icono: '🦷', duracion: '90 min' },
  { id: 'limpieza',      label: 'Limpieza dental',  icono: '✅', duracion: '30 min' },
  { id: 'urgencia',      label: 'Urgencia / Dolor', icono: '🚨', duracion: '45 min' },
  { id: 'consulta',      label: 'Consulta general', icono: '📋', duracion: '30 min' },
]

/** Genera los próximos N días hábiles (lunes–sábado) */
function proximosDiasHabiles(cantidad: number): Date[] {
  const dias: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() + 1) // empezar mañana

  while (dias.length < cantidad) {
    if (cursor.getDay() !== 0) { // 0 = domingo
      dias.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
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
  // Ajustar a UTC-3 (Argentina)
  const offset = -3 * 60
  const utc = dt.getTime() - dt.getTimezoneOffset() * 60000
  const ar = new Date(utc + offset * 60000)
  return ar.toISOString().replace('Z', '-03:00')
}

type Paso = 1 | 2 | 3 | 4

/* ─── COMPONENT ─────────────────────────────────────────── */
export default function TurnosPage() {
  const [paso, setPaso] = useState<Paso>(1)

  // Paso 1
  const [tratamiento, setTratamiento] = useState('')

  // Paso 2
  const dias = proximosDiasHabiles(10)
  const [diaIndex, setDiaIndex] = useState(0)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [errorSlots, setErrorSlots] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')

  // Paso 3
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  // Paso 4
  const [turnoConfirmado, setTurnoConfirmado] = useState<TurnoResponse | null>(null)

  const tratamientoObj = tratamientos.find((t) => t.id === tratamiento)
  const diaSeleccionado = dias[diaIndex]

  // Fetch slots cuando cambia día o tratamiento
  const fetchSlots = useCallback(async () => {
    if (!tratamiento || !diaSeleccionado) return
    setLoadingSlots(true)
    setErrorSlots('')
    setHoraSeleccionada('')
    try {
      const fecha = diaSeleccionado.toISOString().split('T')[0]
      const res = await getSlots(fecha, tratamiento)
      setSlots(res.slots)
      if (res.slots.length === 0) {
        setErrorSlots(res.mensaje ?? 'Sin disponibilidad para este día. Probá otro.')
      }
    } catch (e: unknown) {
      setErrorSlots(e instanceof Error ? e.message : 'Error al cargar horarios')
    } finally {
      setLoadingSlots(false)
    }
  }, [tratamiento, diaSeleccionado])

  useEffect(() => {
    if (paso === 2) fetchSlots()
  }, [paso, fetchSlots])

  async function confirmarTurno() {
    if (!nombre.trim() || !telefono.trim()) return
    setEnviando(true)
    setErrorEnvio('')
    try {
      const fechaHora = toISOLocal(diaSeleccionado, horaSeleccionada)
      const res = await solicitarTurno({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        fecha_hora: fechaHora,
        tipo_tratamiento: tratamiento,
        notas: notas.trim() || undefined,
      })
      setTurnoConfirmado(res)
      setPaso(4)
    } catch (e: unknown) {
      setErrorEnvio(e instanceof Error ? e.message : 'Error al confirmar el turno')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Soluciones Dentales
          </Link>
          {paso < 4 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Paso {paso} de 3
            </span>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Barra de progreso */}
        {paso < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                  paso > n ? 'bg-teal-600 text-white' :
                  paso === n ? 'bg-teal-600 text-white ring-4 ring-teal-100' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {paso > n ? (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </div>
                {n < 3 && (
                  <div className={`flex-1 h-1 rounded-full transition-colors ${paso > n ? 'bg-teal-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PASO 1: Tratamiento ── */}
        {paso === 1 && (
          <div>
            <h1 className="text-2xl font-black text-slate-800 mb-1">¿Qué tratamiento necesitás?</h1>
            <p className="text-slate-400 text-sm mb-6">Seleccioná el motivo de tu consulta</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tratamientos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTratamiento(t.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    tratamiento === t.id
                      ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100'
                      : 'border-slate-200 bg-white hover:border-teal-200 hover:shadow-sm'
                  }`}
                >
                  <div className="text-2xl mb-2">{t.icono}</div>
                  <p className="font-semibold text-slate-700 text-sm leading-tight">{t.label}</p>
                  <p className="text-slate-400 text-xs mt-1">⏱ {t.duracion}</p>
                </button>
              ))}
            </div>
            <button
              disabled={!tratamiento}
              onClick={() => setPaso(2)}
              className="w-full mt-6 bg-teal-600 text-white py-3.5 rounded-full font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors shadow-md shadow-teal-200"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ── PASO 2: Fecha y hora ── */}
        {paso === 2 && (
          <div>
            <h1 className="text-2xl font-black text-slate-800 mb-1">Elegí fecha y hora</h1>
            <p className="text-slate-400 text-sm mb-6">
              {tratamientoObj?.icono} {tratamientoObj?.label} · {tratamientoObj?.duracion}
            </p>

            {/* Selector de días */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Próximos días disponibles</p>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {dias.map((dia, i) => (
                <button
                  key={i}
                  onClick={() => setDiaIndex(i)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-full border font-medium text-sm transition-all ${
                    diaIndex === i
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {formatFechaDisplay(dia)}
                </button>
              ))}
            </div>

            {/* Slots */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Horarios disponibles</p>
            {loadingSlots ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-20 h-12 bg-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : errorSlots ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-700 text-sm flex items-center gap-2">
                <span>⚠️</span> {errorSlots}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {slots.map((hora) => (
                  <button
                    key={hora}
                    onClick={() => setHoraSeleccionada(hora)}
                    className={`py-3 rounded-xl border font-semibold text-sm transition-all ${
                      horaSeleccionada === hora
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:shadow-sm'
                    }`}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPaso(1)}
                className="px-5 py-3 rounded-full border border-slate-200 text-slate-600 font-medium hover:border-slate-300 transition-colors"
              >
                ← Volver
              </button>
              <button
                disabled={!horaSeleccionada}
                onClick={() => setPaso(3)}
                className="flex-1 bg-teal-600 text-white py-3 rounded-full font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors shadow-md shadow-teal-200"
              >
                Confirmar horario →
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Datos personales ── */}
        {paso === 3 && (
          <div>
            <h1 className="text-2xl font-black text-slate-800 mb-1">Tus datos</h1>
            <p className="text-slate-400 text-sm mb-6">Sin registro — solo nombre y teléfono</p>

            {/* Resumen */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-6">
              <p className="font-bold text-teal-800 text-sm mb-1">📅 Tu turno seleccionado</p>
              <p className="text-slate-600 text-sm">
                {tratamientoObj?.icono} {tratamientoObj?.label}
                &nbsp;·&nbsp;
                {formatFechaDisplay(diaSeleccionado)} a las {horaSeleccionada}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: María García"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white text-slate-800 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white text-slate-800 transition-all"
                />
                <p className="text-slate-400 text-xs mt-1.5">Te avisamos por WhatsApp cuando se confirme</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Tengo alergia a la penicilina, fue derivado por otro médico..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white text-slate-800 resize-none transition-all"
                />
              </div>
            </div>

            {errorEnvio && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                <span>❌</span> {errorEnvio}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPaso(2)}
                className="px-5 py-3 rounded-full border border-slate-200 text-slate-600 font-medium hover:border-slate-300 transition-colors"
              >
                ← Volver
              </button>
              <button
                disabled={!nombre.trim() || !telefono.trim() || enviando}
                onClick={confirmarTurno}
                className="flex-1 bg-teal-600 text-white py-3 rounded-full font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors shadow-md shadow-teal-200 flex items-center justify-center gap-2"
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
            </div>

            <p className="text-center text-slate-400 text-xs mt-4">
              Tu información es confidencial y no será compartida con terceros.
            </p>
          </div>
        )}

        {/* ── PASO 4: Confirmación ── */}
        {paso === 4 && turnoConfirmado && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-float">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">¡Turno solicitado!</h1>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Te vamos a contactar al <span className="font-semibold text-slate-700">{telefono}</span> para confirmar. Revisá WhatsApp.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left mb-6 shadow-sm max-w-sm mx-auto">
              <p className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-xs">✓</span>
                Resumen del turno
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>👤 {nombre}</p>
                <p>{tratamientoObj?.icono} {tratamientoObj?.label}</p>
                <p>📅 {formatFechaDisplay(diaSeleccionado)} a las {horaSeleccionada}</p>
                <p>📱 {telefono}</p>
                <p className="text-slate-400 text-xs pt-1">Ref. #{turnoConfirmado.turno_id}</p>
              </div>
            </div>

            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER ?? '5491100000000'}?text=${encodeURIComponent(
                `Hola! Acabo de solicitar un turno de ${tratamientoObj?.label} para el ${formatFechaDisplay(diaSeleccionado)} a las ${horaSeleccionada}. Mi nombre es ${nombre}.`
              )}`}
              target="_blank"
              className="block w-full max-w-sm mx-auto bg-green-500 text-white py-3.5 rounded-full font-bold hover:bg-green-600 transition-colors shadow-md shadow-green-200 mb-3"
            >
              💬 Confirmar por WhatsApp
            </a>
            <Link href="/" className="block text-teal-600 text-sm hover:underline">
              Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
