'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { usePacienteStore } from '@/store/pacienteStore'
import { getSala, checkInPaciente, type SalaInfo } from '@/lib/api/telemedicina'
import JitsiSala from '@/components/JitsiSala'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

export default function SalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('telemedicina.sala')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const router = useRouter()
  const { token, paciente } = usePacienteStore()

  const [sala, setSala] = useState<SalaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enSala, setEnSala] = useState(false)

  useEffect(() => {
    if (!token) {
      router.push('/mis-turnos')
      return
    }
    getSala(token, parseInt(id))
      .then(setSala)
      .catch((e: Error) => setError(e.message ?? t('loadError')))
      .finally(() => setLoading(false))
  }, [token, id, router, t])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400" style={{ background: 'var(--bg-base)' }}>...</div>
  }

  if (error || !sala) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--bg-base)' }}>
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-red-400 mb-4">{error || t('loadError')}</p>
        <button onClick={() => router.push('/mis-turnos')} className="text-teal-400 hover:text-teal-300">
          ← Volver
        </button>
      </div>
    )
  }

  const fechaFmt = new Date(sala.fecha_hora).toLocaleString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  if (!enSala) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-md w-full bg-[--bg-card] border border-white/5 rounded-3xl p-8 text-center space-y-5">
          <div className="text-5xl">📹</div>
          <div>
            <h1 className="text-2xl font-black text-white">{t('title')}</h1>
            <p className="text-slate-400 text-sm mt-1">{fechaFmt}</p>
          </div>
          <p className="text-slate-300 text-sm">{t('instrucciones')}</p>
          {sala.password && (
            <p className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
              🔑 {t('passwordHint', { password: sala.password })}
            </p>
          )}
          <button
            onClick={async () => {
              setEnSala(true)
              if (token) {
                try { await checkInPaciente(token, parseInt(id)) } catch { /* silencio: solo es una notif */ }
              }
            }}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3.5 rounded-full font-bold"
          >
            {t('joinButton')}
          </button>
          <button
            onClick={() => router.push('/mis-turnos')}
            className="block w-full text-slate-500 text-sm hover:text-slate-300"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <button
        onClick={() => router.push('/mis-turnos')}
        className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg"
      >
        ← {t('leave')}
      </button>
      <JitsiSala
        roomName={sala.room_name}
        password={sala.password}
        displayName={paciente?.nombre ?? 'Paciente'}
        onLeave={() => router.push('/mis-turnos')}
      />
    </div>
  )
}
