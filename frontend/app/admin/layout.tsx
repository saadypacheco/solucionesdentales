'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icono: '📊' },
  { href: '/admin/agenda',     label: 'Agenda',     icono: '📅' },
  { href: '/admin/pacientes',  label: 'Pacientes',  icono: '👥' },
  { href: '/admin/crm',        label: 'CRM',        icono: '🎯' },
  { href: '/admin/galeria',    label: 'Galería',    icono: '🖼️' },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { logout, user } = useAuthStore()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push('/admin/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        w-56 bg-[#080f1a] border-r border-white/5
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex md:h-screen md:flex-shrink-0
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <p className="text-white font-black text-sm">Soluciones Dentales</p>
          <p className="text-slate-600 text-xs">Panel admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const activo = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activo
                    ? 'bg-teal-600/15 text-teal-400 border border-teal-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icono}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer usuario */}
        <div className="px-4 py-4 border-t border-white/5">
          {user && (
            <div className="mb-3">
              <p className="text-white text-xs font-bold truncate">{user.nombre}</p>
              <p className="text-slate-600 text-xs truncate">{user.email}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 text-center text-slate-500 hover:text-slate-300 text-xs py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Ver web
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 text-slate-500 hover:text-red-400 text-xs py-1.5 rounded-lg hover:bg-red-500/5 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const token = useAuthStore((s) => s.token)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const esLogin = pathname === '/admin/login'

  useEffect(() => {
    if (esLogin) return
    if (!token) router.replace('/admin/login')
  }, [token, esLogin, router])

  if (!token && !esLogin) return null
  if (esLogin) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#080f1a]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-white font-bold text-sm">Soluciones Dentales</p>
          <div className="w-6" />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
