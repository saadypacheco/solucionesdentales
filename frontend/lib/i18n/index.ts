import { useEffect, useState } from 'react'
import { useLangStore, type Lang } from '@/store/langStore'
import { es } from './es'
import { en } from './en'

export type { Lang }

const dicts = { es, en }

export function useT() {
  const lang = useLangStore((state) => state.lang)
  const [dict, setDict] = useState(dicts.es)

  useEffect(() => {
    setDict(dicts[lang] || dicts.es)
  }, [lang])

  return dict
}

export function t(obj: Record<string, any>, path: string): string {
  const result = path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path
  return String(result)
}
