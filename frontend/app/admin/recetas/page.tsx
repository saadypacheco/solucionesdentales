'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  listarRecetasAdmin,
  crearReceta,
  archivarReceta,
  type Receta,
} from '@/lib/api/recetas'
import { getPacientesAdmin, type Paciente } from '@/lib/api/admin'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

export default function AdminRecetasPage() {
  const t = useTranslations('recetas')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const { token } = useAuthStore()

  const [recetas, setRecetas] = useState<Receta[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [pacienteId, setPacienteId] = useState<number | ''>('')
  const [contenido, setContenido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [r, p] = await Promise.all([
        listarRecetasAdmin(token),
        getPacientesAdmin(token),
      ])
      setRecetas(r)
      setPacientes(p)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) router.push('/admin/login')
  }, [token, router])
  useEffect(() => { cargar() }, [cargar])

  async function submit() {
    if (!token || !pacienteId || !contenido.trim()) return
    setEnviando(true); setError('')
    try {
      await crearReceta(token, { paciente_id: Number(pacienteId), contenido: contenido.trim() })
      setContenido('')
      setPacienteId('')
      setShowForm(false)
      await cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('form.errorCreate'))
    } finally {
      setEnviando(false)
    }
  }

  async function archivar(id: number) {
    if (!token || !confirm(t('card.confirmArchivar'))) return
    await archivarReceta(token, id)
    setRecetas((prev) => prev.filter((r) => r.id !== id))
  }

  function fmt(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm">{t('subtitle')}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            {t('nueva')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[--bg-card] border border-teal-500/30 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white">{t('form.title')}</h3>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              {t('form.selectPaciente')}
            </label>
            <select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="">—</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} · {p.telefono}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              {t('form.contenido')}
            </label>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={8}
              placeholder={t('form.contenidoPlaceholder')}
              className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 resize-y"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setContenido(''); setPacienteId(''); setError('') }}
              className="flex-1 border border-white/10 text-slate-300 py-2 rounded-lg text-sm hover:border-white/20"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={submit}
              disabled={enviando || !pacienteId || !contenido.trim()}
              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {enviando ? t('form.submitting') : t('form.submit')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : recetas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-slate-400">{t('noRecetas')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recetas.map((r) => (
            <div key={r.id} className="bg-[--bg-card] border border-white/5 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-bold text-white">{r.pacientes?.nombre ?? 'Paciente'}</p>
                  <p className="text-xs text-slate-500">{t('card.fecha', { fecha: fmt(r.created_at) })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" className="text-xs text-teal-400 hover:text-teal-300 font-semibold">
                      {t('card.verPdf')}
                    </a>
                  )}
                  <button
                    onClick={() => archivar(r.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    {t('card.archivar')}
                  </button>
                </div>
              </div>
              <pre className="text-slate-400 text-xs whitespace-pre-wrap font-mono bg-slate-900/40 rounded p-3 max-h-32 overflow-y-auto">
                {r.contenido}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
