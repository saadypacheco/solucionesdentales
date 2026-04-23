'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePacienteStore } from '@/store/pacienteStore'
import { getMiHistorial, type Historial } from '@/lib/api/historial'
import { listarMisTratamientos, type Tratamiento } from '@/lib/api/tratamientos'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function MiHistorialPage() {
  const t = useTranslations('historial.paciente')
  const tT = useTranslations('tratamientos')
  const tNav = useTranslations('navbar')
  const router = useRouter()
  const { token } = usePacienteStore()

  const [historial, setHistorial] = useState<Historial | null>(null)
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { router.push('/mis-turnos'); return }
    Promise.all([
      getMiHistorial(token),
      listarMisTratamientos(token),
    ])
      .then(([h, tt]) => { setHistorial(h); setTratamientos(tt) })
      .finally(() => setLoading(false))
  }, [token, router])

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

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center">Cargando...</p>
        ) : (
          <>
            {/* Historial */}
            <div className="bg-white rounded-2xl p-5 shadow">
              <h2 className="font-bold text-slate-800 mb-3">📋 Datos clínicos</h2>
              {(!historial || ((historial.alergias?.length ?? 0) === 0 && (historial.medicacion?.length ?? 0) === 0 && !historial.antecedentes)) ? (
                <p className="text-slate-500 text-sm italic">{t('noData')}</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {historial.alergias && historial.alergias.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Alergias</p>
                      <p className="text-slate-700">{historial.alergias.join(' · ')}</p>
                    </div>
                  )}
                  {historial.medicacion && historial.medicacion.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Medicación</p>
                      <p className="text-slate-700">{historial.medicacion.join(' · ')}</p>
                    </div>
                  )}
                  {historial.antecedentes && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Antecedentes</p>
                      <pre className="text-slate-700 whitespace-pre-wrap font-sans">{historial.antecedentes}</pre>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-4 italic border-t border-slate-100 pt-3">
                {t('verAdmin')}
              </p>
            </div>

            {/* Tratamientos */}
            <div className="bg-white rounded-2xl p-5 shadow">
              <h2 className="font-bold text-slate-800 mb-3">🦷 {tT('paciente.title')}</h2>
              {tratamientos.length === 0 ? (
                <p className="text-slate-500 text-sm italic">{tT('paciente.noTratamientos')}</p>
              ) : (
                <div className="space-y-2">
                  {tratamientos.map((tt) => (
                    <div key={tt.id} className="border border-slate-100 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-bold text-slate-800 text-sm">{tt.descripcion}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          tt.estado === 'completado' ? 'bg-green-100 text-green-700'
                          : tt.estado === 'en_curso' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tT(`estados.${tt.estado}`)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{tt.fecha}</p>
                      {tt.usuarios && (
                        <p className="text-xs text-teal-700">{tT('card.porOdontologo', { nombre: tt.usuarios.nombre })}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
