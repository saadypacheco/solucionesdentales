'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { usePacienteStore } from '@/store/pacienteStore'
import { listarRecetasPaciente, type Receta } from '@/lib/api/recetas'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

export default function MisRecetasPage() {
  const t = useTranslations('recetas')
  const tCard = useTranslations('recetas.card')
  const tNav = useTranslations('navbar')
  const router = useRouter()
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const { token } = usePacienteStore()

  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      router.push('/mis-turnos')
      return
    }
    listarRecetasPaciente(token).then(setRecetas).finally(() => setLoading(false))
  }, [token, router])

  function fmt(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
      <header className="bg-slate-950 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/mis-turnos" className="text-teal-400 font-semibold text-sm hover:text-teal-300">
            ← {tNav('back')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">{t('paciente.title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('paciente.subtitle')}</p>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center">{t('loading')}</p>
        ) : recetas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-slate-500">{t('paciente.noRecetas')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recetas.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">{tCard('fecha', { fecha: fmt(r.created_at) })}</p>
                  {r.usuarios && (
                    <p className="text-xs text-teal-700 font-semibold">
                      {tCard('porOdontologo', { nombre: r.usuarios.nombre })}
                    </p>
                  )}
                </div>
                <pre className="text-slate-700 text-sm whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3 mb-3">
                  {r.contenido}
                </pre>
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    className="inline-block bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-full"
                  >
                    {tCard('verPdf')}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
