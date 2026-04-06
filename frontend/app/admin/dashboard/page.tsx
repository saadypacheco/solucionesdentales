'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import {
  getTurnosAdmin, getPacientesAdmin, getAlarmas, patchTurnoEstado, resolverAlarma,
  type TurnoAdmin, type Paciente, type Alarma,
} from '@/lib/api/admin'

/* ─── HELPERS ─── */
function fechaHoy(): string {
  return new Date().toISOString().split('T')[0]
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const estadoBadge: Record<string, string> = {
  confirmado: 'bg-green-500/15 text-green-400',
  solicitado: 'bg-yellow-500/15 text-yellow-400',
  realizado:  'bg-slate-500/15 text-slate-400',
  cancelado:  'bg-red-500/15 text-red-400',
  ausente:    'bg-orange-500/15 text-orange-400',
}

const prioridadIcon: Record<string, string> = {
  alta: '🔴', media: '🟡', baja: '🟢',
}

/* ─── COMPONENT ─── */
export default function AdminDashboard() {
  const { token } = useAuthStore()

  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [alarmas, setAlarmas] = useState<Alarma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    async function cargar() {
      try {
        const [t, p, a] = await Promise.all([
          getTurnosAdmin(token!, fechaHoy()),
          getPacientesAdmin(token!),
          getAlarmas(token!),
        ])
        setTurnos(t)
        setPacientes(p)
        setAlarmas(a)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [token])

  async function cambiarEstado(turnoId: number, estado: string) {
    if (!token) return
    try {
      const actualizado = await patchTurnoEstado(token, turnoId, estado)
      setTurnos((prev) => prev.map((t) => t.id === turnoId ? { ...t, estado: actualizado.estado } : t))
    } catch { /* silencioso */ }
  }

  async function marcarResuelta(alarmaId: number) {
    if (!token) return
    try {
      await resolverAlarma(token, alarmaId)
      setAlarmas((prev) => prev.filter((a) => a.id !== alarmaId))
    } catch { /* silencioso */ }
  }

  const turnosConfirmados = turnos.filter((t) => t.estado === 'confirmado').length
  const turnosSolicitados = turnos.filter((t) => t.estado === 'solicitado').length
  const pacientesNuevosHoy = pacientes.filter((p) => p.created_at.startsWith(fechaHoy())).length
  const alarmasActivas = alarmas.filter((a) => !a.resuelta).length

  const kpis = [
    { label: 'Turnos hoy',      valor: turnos.length,        delta: `${turnosConfirmados} confirmados`,  icono: '📅' },
    { label: 'Sin confirmar',   valor: turnosSolicitados,    delta: 'Requieren confirmación',            icono: '⏳' },
    { label: 'Nuevos hoy',      valor: pacientesNuevosHoy,   delta: 'Pacientes ingresados',              icono: '👤' },
    { label: 'Alarmas activas', valor: alarmasActivas,       delta: 'Requieren atención',                icono: '🔔' },
  ]

  const pipeline = [
    { estado: 'Nuevo',          id: 'nuevo',           count: pacientes.filter(p => p.estado === 'nuevo').length },
    { estado: 'Contactado',     id: 'contactado',      count: pacientes.filter(p => p.estado === 'contactado').length },
    { estado: 'Interesado',     id: 'interesado',      count: pacientes.filter(p => p.estado === 'interesado').length },
    { estado: 'Turno agendado', id: 'turno_agendado',  count: pacientes.filter(p => p.estado === 'turno_agendado').length },
    { estado: 'Activo',         id: 'paciente_activo', count: pacientes.filter(p => p.estado === 'paciente_activo').length },
    { estado: 'Inactivo',       id: 'inactivo',        count: pacientes.filter(p => p.estado === 'inactivo').length },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link href="/" target="_blank" className="text-slate-500 hover:text-teal-400 text-sm transition-colors">
          Ver sitio →
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[--bg-card] border border-white/5 rounded-2xl p-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-slate-700 rounded w-2/3" />
                <div className="h-8 bg-slate-700 rounded w-1/2" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{k.label}</p>
                  <p className="text-3xl font-black text-white mt-1 number-display">{k.valor}</p>
                  <p className="text-xs text-teal-400 mt-1">{k.delta}</p>
                </div>
                <span className="text-2xl">{k.icono}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Agenda del día */}
        <div className="lg:col-span-2 bg-[--bg-card] border border-white/5 rounded-2xl">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white">Agenda de hoy</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                {turnos.length} turnos
              </span>
              <Link href="/admin/agenda" className="text-teal-400 text-xs hover:text-teal-300 transition-colors">
                Ver semana →
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 bg-slate-700 rounded w-12" />
                  <div className="flex-1 h-4 bg-slate-700 rounded" />
                  <div className="h-4 bg-slate-700 rounded w-20" />
                </div>
              ))}
            </div>
          ) : turnos.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Sin turnos para hoy</div>
          ) : (
            <div className="divide-y divide-white/[.04]">
              {turnos.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[.02] transition-colors">
                  <span className="text-sm font-bold text-slate-400 w-14 flex-shrink-0">{formatHora(t.fecha_hora)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {t.pacientes?.nombre ?? 'Paciente'}
                    </p>
                    <p className="text-slate-500 text-xs truncate capitalize">{t.tipo_tratamiento}</p>
                  </div>
                  <select
                    value={t.estado}
                    onChange={(e) => cambiarEstado(t.id, e.target.value)}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-full border-0 cursor-pointer outline-none ${estadoBadge[t.estado] ?? 'bg-slate-800 text-slate-400'}`}
                  >
                    {['solicitado','confirmado','realizado','cancelado','ausente'].map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  {t.pacientes?.telefono && (
                    <a
                      href={`https://wa.me/549${t.pacientes.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${t.pacientes.nombre}, te confirmamos tu turno de ${t.tipo_tratamiento} para hoy a las ${formatHora(t.fecha_hora)}.`)}`}
                      target="_blank"
                      className="text-green-500 hover:text-green-400 transition-colors flex-shrink-0"
                      title="WhatsApp"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.25.626 4.35 1.714 6.126L.057 23.882l5.9-1.548A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.504.92.936-3.41-.234-.37A9.818 9.818 0 112 12c0-5.422 4.396-9.818 9.818-9.818S21.636 6.578 21.636 12 17.24 21.818 12 21.818z"/>
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alarmas */}
        <div className="bg-[--bg-card] border border-white/5 rounded-2xl">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white">Alarmas</h2>
            {alarmasActivas > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {alarmasActivas}
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse h-12 bg-slate-800 rounded-xl" />)}
            </div>
          ) : alarmas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              <span className="text-2xl block mb-2">✅</span>
              Sin alarmas activas
            </div>
          ) : (
            <div className="divide-y divide-white/[.04]">
              {alarmas.slice(0, 6).map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5">{prioridadIcon[a.prioridad]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-300 leading-tight">{a.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{a.descripcion}</p>
                    </div>
                    <button
                      onClick={() => marcarResuelta(a.id)}
                      className="flex-shrink-0 text-slate-600 hover:text-green-400 transition-colors"
                      title="Marcar resuelta"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline CRM */}
      <div className="bg-[--bg-card] border border-white/5 rounded-2xl">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-white">Pipeline CRM</h2>
          <Link href="/admin/crm" className="text-teal-400 text-xs hover:text-teal-300 transition-colors">
            Ver kanban →
          </Link>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {pipeline.map((col) => (
              <div key={col.id} className="flex flex-col items-center gap-2 w-28">
                <p className="text-xs text-slate-500 text-center font-medium">{col.estado}</p>
                <p className="text-3xl font-black text-white number-display">{col.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
