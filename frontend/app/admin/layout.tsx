'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    // Permitir acceso a /admin/login sin token
    if (pathname === '/admin/login') return
    if (!token) {
      router.replace('/admin/login')
    }
  }, [token, pathname, router])

  // No renderizar nada hasta saber si hay sesión (evita flash)
  if (!token && pathname !== '/admin/login') return null

  return <>{children}</>
}
