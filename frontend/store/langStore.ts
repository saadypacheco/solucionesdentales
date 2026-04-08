import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'es' | 'en'

interface LangStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: 'es',
      setLang: (lang: Lang) => set({ lang }),
    }),
    { name: 'lang-dentales' }
  )
)
