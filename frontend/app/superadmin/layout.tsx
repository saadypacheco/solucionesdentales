'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('superadmin')
  const tNav = useTranslations('superadmin.nav')
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, logout } = useAuthStore()

  useEffect(() => {
    if (!token) {
      router.replace('/admin/login')
      return
    }
    if (user && user.rol !== 'superadmin') {
      router.replace('/admin/dashboard')
    }
  }, [token, user, router])

  if (!token || (user && user.rol !== 'superadmin')) return null

  function handleLogout() {
    logout()
    router.push('/admin/login')
  }

  const NAV = [
    { href: '/superadmin',           label: tNav('consultorios'), icono: '🏥' },
    { href: '/superadmin/audit-log', label: tNav('auditLog'),     icono: '📜' },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <aside className="w-56 bg-[#080f1a] border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/5">
          <p className="text-white font-black text-sm">{t('title')}</p>
          <p className="text-slate-600 text-xs">{t('subtitle')}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const activo = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <div className="px-4 py-4 border-t border-white/5 space-y-3">
          {user && (
            <div>
              <p className="text-white text-xs font-bold truncate">{user.nombre}</p>
              <p className="text-slate-600 text-xs truncate">{user.email}</p>
            </div>
          )}
          <LanguageSwitcher variant="full" />
          <button
            onClick={handleLogout}
            className="w-full text-slate-500 hover:text-red-400 text-xs py-1.5 rounded-lg hover:bg-red-500/5 transition-colors"
          >
            {tNav('logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
