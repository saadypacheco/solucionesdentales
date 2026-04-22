'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StaffUser, ConsultorioInfo } from '@/lib/api/admin'

interface AuthState {
  token: string | null
  user: StaffUser | null
  consultorio: ConsultorioInfo | null
  setAuth: (token: string, user: StaffUser, consultorio?: ConsultorioInfo | null) => void
  setConsultorio: (consultorio: ConsultorioInfo | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      consultorio: null,
      setAuth: (token, user, consultorio = null) => set({ token, user, consultorio }),
      setConsultorio: (consultorio) => set({ consultorio }),
      logout: () => set({ token: null, user: null, consultorio: null }),
    }),
    { name: 'auth-dentales' },
  ),
)
