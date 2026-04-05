'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface IdentidadState {
  sessionId: string;
  pacienteId: number | null;
  nombre: string | null;
  telefono: string | null;
  verificado: boolean;
  setIdentidad: (datos: { pacienteId: number; nombre: string; telefono: string }) => void;
  setVerificado: (v: boolean) => void;
  reset: () => void;
}

export const useIdentidad = create<IdentidadState>()(
  persist(
    (set) => ({
      sessionId: uuidv4(),
      pacienteId: null,
      nombre: null,
      telefono: null,
      verificado: false,
      setIdentidad: (datos) => set(datos),
      setVerificado: (v) => set({ verificado: v }),
      reset: () => set({ pacienteId: null, nombre: null, telefono: null, verificado: false }),
    }),
    { name: 'identidad-dentales' },
  ),
);
