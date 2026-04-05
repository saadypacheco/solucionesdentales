'use client'

import { useState } from 'react'
import Link from 'next/link'

const kpis = [
  { label: 'Leads hoy', valor: '8', delta: '+3 vs ayer', color: 'teal', icono: '👥' },
  { label: 'Turnos hoy', valor: '12', delta: '4 confirmados', color: 'blue', icono: '📅' },
  { label: 'Conversión', valor: '64%', delta: '+8% esta semana', color: 'green', icono: '📈' },
  { label: 'Pacientes activos', valor: '148', delta: '12 nuevos este mes', color: 'purple', icono: '🏥' },
]

const turnosHoy = [
  { hora: '09:00', paciente: 'Ana Torres', tratamiento: 'Blanqueamiento', estado: 'confirmado', tel: '11 9876-5432' },
  { hora: '10:30', paciente: 'Carlos López', tratamiento: 'Ortodoncia', estado: 'confirmado', tel: '11 8765-4321' },
  { hora: '11:30', paciente: 'Lucía Martínez', tratamiento: 'Consulta', estado: 'solicitado', tel: '11 7654-3210' },
  { hora: '14:00', paciente: 'Diego Sánchez', tratamiento: 'Implante', estado: 'confirmado', tel: '11 6543-2109' },
  { hora: '15:30', paciente: 'Valeria Gómez', tratamiento: 'Limpieza', estado: 'solicitado', tel: '11 5432-1098' },
  { hora: '17:00', paciente: 'Martín Ruiz', tratamiento: 'Urgencia', estado: 'confirmado', tel: '11 4321-0987' },
]

const alarmas = [
  { tipo: 'alta', icono: '🔴', titulo: 'Lead sin seguimiento +24hs', desc: 'Pedro Álvarez — esperando respuesta desde ayer', accion: 'Contactar' },
  { tipo: 'media', icono: '🟡', titulo: 'Turno sin confirmar en 48hs', desc: 'Lucía Martínez — turno mañana 11:30', accion: 'Confirmar' },
  { tipo: 'media', icono: '🟡', titulo: 'Tratamiento incompleto', desc: 'Roberto Silva — ortodoncia sin turno de seguimiento', accion: 'Ver paciente' },
  { tipo: 'baja', icono: '🟢', titulo: 'Reactivación sugerida', desc: '5 pacientes inactivos hace +6 meses', accion: 'Ver lista' },
]

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icono: '📊', activo: true },
  { href: '/admin/agenda', label: 'Agenda', icono: '📅', activo: false },
  { href: '/admin/pacientes', label: 'Pacientes', icono: '👥', activo: false },
  { href: '/admin/crm', label: 'CRM', icono: '🎯', activo: false },
  { href: '/admin/galeria', label: 'Galería', icono: '🖼️', activo: false },
  { href: '/admin/alarmas', label: 'Alarmas', icono: '🔔', activo: false, badge: 4 },
  { href: '/admin/configuracion', label: 'Config IA', icono: '⚙️', activo: false },
]

const estadoColor: Record<string, string> = {
  confirmado: 'bg-green-100 text-green-700',
  solicitado: 'bg-yellow-100 text-yellow-700',
  realizado: 'bg-slate-100 text-slate-600',
  cancelado: 'bg-red-100 text-red-600',
}

export default function AdminDashboard() {
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-60 bg-slate-900 text-white flex flex-col transition-transform duration-200`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦷</span>
            <div>
              <p className="font-bold text-sm">Soluciones Dentales</p>
              <p className="text-slate-400 text-xs">Panel admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.activo
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icono}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-xs font-bold">D</div>
            <div>
              <p className="text-sm font-medium">Dra. Ramírez</p>
              <p className="text-slate-400 text-xs">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarAbierto(true)}
              className="md:hidden text-slate-600 hover:text-slate-800"
            >
              ☰
            </button>
            <div>
              <h1 className="font-bold text-slate-800 text-sm sm:text-base">Dashboard</h1>
              <p className="text-slate-400 text-xs hidden sm:block">Sábado 5 de abril, 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-400 hover:text-teal-600 text-xs"
              target="_blank"
            >
              Ver sitio →
            </Link>
            <div className="relative">
              <button className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                D
              </button>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center">4</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{k.label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{k.valor}</p>
                    <p className="text-xs text-teal-600 mt-1">{k.delta}</p>
                  </div>
                  <span className="text-2xl">{k.icono}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Agenda del día */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Agenda de hoy</h2>
                <Link href="/admin/agenda" className="text-teal-600 text-xs hover:underline">Ver completa →</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {turnosHoy.map((t) => (
                  <div key={t.hora + t.paciente} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-14 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-600">{t.hora}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{t.paciente}</p>
                      <p className="text-slate-400 text-xs truncate">{t.tratamiento}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${estadoColor[t.estado]}`}>
                      {t.estado}
                    </span>
                    <a
                      href={`https://wa.me/549${t.tel.replace(/\D/g, '')}`}
                      target="_blank"
                      className="flex-shrink-0 text-green-500 hover:text-green-700 text-lg"
                      title="WhatsApp"
                    >
                      💬
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Alarmas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Alarmas activas</h2>
                <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">{alarmas.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {alarmas.map((a) => (
                  <div key={a.titulo} className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0 mt-0.5">{a.icono}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 leading-tight">{a.titulo}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-tight">{a.desc}</p>
                        <button className="mt-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium">
                          {a.accion} →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mini CRM pipeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Pipeline CRM</h2>
              <Link href="/admin/crm" className="text-teal-600 text-xs hover:underline">Ver kanban completo →</Link>
            </div>
            <div className="p-5 overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {[
                  { estado: 'Nuevo', count: 8, color: 'bg-slate-100 text-slate-700' },
                  { estado: 'Contactado', count: 5, color: 'bg-blue-100 text-blue-700' },
                  { estado: 'Interesado', count: 12, color: 'bg-yellow-100 text-yellow-700' },
                  { estado: 'Turno agendado', count: 7, color: 'bg-teal-100 text-teal-700' },
                  { estado: 'Paciente activo', count: 148, color: 'bg-green-100 text-green-700' },
                  { estado: 'Inactivo', count: 23, color: 'bg-red-100 text-red-600' },
                ].map((col) => (
                  <div key={col.estado} className="flex flex-col items-center gap-1.5 w-28">
                    <div className={`w-full text-center py-2 px-3 rounded-xl text-xs font-semibold ${col.color}`}>
                      {col.estado}
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{col.count}</div>
                    <div className="text-slate-400 text-xs">pacientes</div>
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
