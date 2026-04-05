'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
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

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const estadoColor: Record<string, string> = {
  confirmado:  'bg-green-100 text-green-700',
  solicitado:  'bg-yellow-100 text-yellow-700',
  realizado:   'bg-slate-100 text-slate-500',
  cancelado:   'bg-red-100 text-red-500',
  ausente:     'bg-orange-100 text-orange-600',
}

const prioridadIcon: Record<string, string> = {
  alta: '🔴', media: '🟡', baja: '🟢',
}

const navItems = [
  { href: '/admin/dashboard',     label: 'Dashboard',  icono: '📊', activo: true  },
  { href: '/admin/agenda',        label: 'Agenda',     icono: '📅', activo: false },
  { href: '/admin/pacientes',     label: 'Pacientes',  icono: '👥', activo: false },
  { href: '/admin/crm',           label: 'CRM',        icono: '🎯', activo: false },
  { href: '/admin/galeria',       label: 'Galería',    icono: '🖼️', activo: false },
  { href: '/admin/configuracion', label: 'Config IA',  icono: '⚙️', activo: false },
]

/* ─── COMPONENT ─── */
export default function AdminDashboard() {
  const router = useRouter()
  const { token, user, logout } = useAuthStore()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

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

  function handleLogout() {
    logout()
    router.push('/admin/login')
  }

  // KPIs derivados
  const turnosConfirmados = turnos.filter((t) => t.estado === 'confirmado').length
  const turnosSolicitados = turnos.filter((t) => t.estado === 'solicitado').length
  const pacientesNuevosHoy = pacientes.filter((p) => p.created_at.startsWith(fechaHoy())).length
  const alarmasActivas = alarmas.filter((a) => !a.resuelta).length

  const kpis = [
    { label: 'Turnos hoy', valor: String(turnos.length), delta: `${turnosConfirmados} confirmados`, icono: '📅' },
    { label: 'Sin confirmar', valor: String(turnosSolicitados), delta: 'Requieren confirmación', icono: '⏳' },
    { label: 'Pacientes nuevos', valor: String(pacientesNuevosHoy), delta: 'Ingresados hoy', icono: '👤' },
    { label: 'Alarmas activas', valor: String(alarmasActivas), delta: 'Requieren atención', icono: '🔔' },
  ]

  // Pipeline CRM desde pacientes reales
  const pipeline = [
    { estado: 'Nuevo',          count: pacientes.filter(p => p.estado === 'nuevo').length,          color: 'bg-slate-100 text-slate-700' },
    { estado: 'Contactado',     count: pacientes.filter(p => p.estado === 'contactado').length,     color: 'bg-blue-100 text-blue-700' },
    { estado: 'Interesado',     count: pacientes.filter(p => p.estado === 'interesado').length,     color: 'bg-yellow-100 text-yellow-700' },
    { estado: 'Turno agendado', count: pacientes.filter(p => p.estado === 'turno_agendado').length, color: 'bg-teal-100 text-teal-700' },
    { estado: 'Activo',         count: pacientes.filter(p => p.estado === 'paciente_activo').length,color: 'bg-green-100 text-green-700' },
    { estado: 'Inactivo',       count: pacientes.filter(p => p.estado === 'inactivo').length,       color: 'bg-red-100 text-red-600' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-60 bg-slate-900 text-white flex flex-col transition-transform duration-200`}>
        <div className="px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦷</span>
            <div>
              <p className="font-bold text-sm">Soluciones Dentales</p>
              <p className="text-slate-400 text-xs">Panel admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.activo ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icono}</span>
              <span>{item.label}</span>
              {item.label === 'Alarmas' && alarmasActivas > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {alarmasActivas}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-xs font-bold">
                {user?.nombre?.[0] ?? 'A'}
              </div>
              <div>
                <p className="text-sm font-medium truncate max-w-[100px]">{user?.nombre ?? 'Admin'}</p>
                <p className="text-slate-400 text-xs capitalize">{user?.rol}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              className="text-slate-500 hover:text-red-400 transition-colors text-sm">
              ↩
            </button>
          </div>
        </div>
      </aside>

      {sidebarAbierto && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarAbierto(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarAbierto(true)} className="md:hidden text-slate-600">☰</button>
            <div>
              <h1 className="font-bold text-slate-800 text-sm sm:text-base">Dashboard</h1>
              <p className="text-slate-400 text-xs hidden sm:block">
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <Link href="/" target="_blank" className="text-slate-400 hover:text-teal-600 text-xs transition-colors">
            Ver sitio →
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm">
              ❌ {error}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-8 bg-slate-200 rounded w-1/2" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{k.label}</p>
                      <p className="text-2xl font-black text-slate-800 mt-1 number-display">{k.valor}</p>
                      <p className="text-xs text-teal-600 mt-1">{k.delta}</p>
                    </div>
                    <span className="text-2xl">{k.icono}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Agenda del día */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Agenda de hoy</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  {turnos.length} turnos
                </span>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-4">
                      <div className="h-4 bg-slate-200 rounded w-12" />
                      <div className="flex-1 h-4 bg-slate-200 rounded" />
                      <div className="h-4 bg-slate-200 rounded w-20" />
                    </div>
                  ))}
                </div>
              ) : turnos.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">Sin turnos para hoy</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {turnos.map((t) => (
                    <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <div className="w-14 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-600">{formatHora(t.fecha_hora)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {t.pacientes?.nombre ?? 'Paciente'}
                        </p>
                        <p className="text-slate-400 text-xs truncate capitalize">{t.tipo_tratamiento}</p>
                      </div>
                      {/* Selector de estado */}
                      <select
                        value={t.estado}
                        onChange={(e) => cambiarEstado(t.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border-0 cursor-pointer outline-none ${estadoColor[t.estado] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {['solicitado','confirmado','realizado','cancelado','ausente'].map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                      {t.pacientes?.telefono && (
                        <a
                          href={`https://wa.me/549${t.pacientes.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${t.pacientes.nombre}, te confirmamos tu turno de ${t.tipo_tratamiento} para hoy a las ${formatHora(t.fecha_hora)}.`)}`}
                          target="_blank"
                          className="text-green-500 hover:text-green-700 text-lg flex-shrink-0"
                          title="WhatsApp"
                        >
                          💬
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alarmas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Alarmas</h2>
                {alarmasActivas > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {alarmasActivas}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              ) : alarmas.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  <span className="text-2xl block mb-2">✅</span>
                  Sin alarmas activas
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {alarmas.slice(0, 6).map((a) => (
                    <div key={a.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 mt-0.5">{prioridadIcon[a.prioridad]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 leading-tight">{a.titulo}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-tight">{a.descripcion}</p>
                        </div>
                        <button
                          onClick={() => marcarResuelta(a.id)}
                          className="flex-shrink-0 text-slate-300 hover:text-green-500 transition-colors text-lg"
                          title="Marcar resuelta"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CRM pipeline real */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Pipeline CRM</h2>
              <span className="text-xs text-slate-400">{pacientes.length} pacientes totales</span>
            </div>
            <div className="p-5 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {pipeline.map((col) => (
                  <div key={col.estado} className="flex flex-col items-center gap-1.5 w-28">
                    <div className={`w-full text-center py-2 px-3 rounded-xl text-xs font-bold ${col.color}`}>
                      {col.estado}
                    </div>
                    <div className="text-2xl font-black text-slate-800 number-display">{col.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
