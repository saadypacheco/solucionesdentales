'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PacienteInfo {
  id: number
  nombre: string
  telefono: string
}

interface PacienteState {
  token: string | null
  paciente: PacienteInfo | null
  setAuth: (token: string, paciente: PacienteInfo) => void
  logout: () => void
}

export const usePacienteStore = create<PacienteState>()(
  persist(
    (set) => ({
      token: null,
      paciente: null,
      setAuth: (token, paciente) => set({ token, paciente }),
      logout: () => set({ token: null, paciente: null }),
    }),
    { name: 'paciente-dentales' },
  ),
)
