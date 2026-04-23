'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { getPacientesAdmin, importarPacientesCSV, type Paciente, type ImportCSVResult } from '@/lib/api/admin'

const estadoColor: Record<string, string> = {
  nuevo:           'bg-blue-500/15 text-blue-400',
  contactado:      'bg-purple-500/15 text-purple-400',
  interesado:      'bg-orange-500/15 text-orange-400',
  turno_agendado:  'bg-teal-500/15 text-teal-400',
  paciente_activo: 'bg-green-500/15 text-green-400',
  inactivo:        'bg-slate-500/15 text-slate-500',
  perdido:         'bg-red-500/15 text-red-400',
}

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 60 ? 'bg-green-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-slate-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-6 text-right">{score}</span>
    </div>
  )
}

export default function AdminPacientesPage() {
  const t = useTranslations('admin.pacientes')
  const tEstados = useTranslations('estadosPaciente')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)

  const router = useRouter()
  const { token, user } = useAuthStore()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<'score' | 'fecha' | 'nombre'>('fecha')
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportCSVResult | null>(null)
  const [importError, setImportError] = useState('')

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    const file = (e.currentTarget.elements.namedItem('archivo') as HTMLInputElement)?.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const r = await importarPacientesCSV(token, file)
      setImportResult(r)
      if (r.creados > 0) {
        const nuevos = await getPacientesAdmin(token)
        setPacientes(nuevos)
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false)
    }
  }

  function cerrarImport() {
    setShowImport(false)
    setImportResult(null)
    setImportError('')
  }

  const puedeImportar = user?.rol === 'admin' || user?.rol === 'superadmin'

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: '2-digit' })
  }

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    getPacientesAdmin(token).then(setPacientes).finally(() => setLoading(false))
  }, [token, router])

  const filtrados = useMemo(() => {
    let lista = [...pacientes]
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter((p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.telefono?.includes(q) ||
        p.email?.toLowerCase().includes(q)
      )
    }
    if (filtroEstado) {
      lista = lista.filter((p) => p.estado === filtroEstado)
    }
    lista.sort((a, b) => {
      if (ordenarPor === 'score') return b.score - a.score
      if (ordenarPor === 'nombre') return (a.nombre ?? '').localeCompare(b.nombre ?? '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return lista
  }, [pacientes, busqueda, filtroEstado, ordenarPor])

  const estados = Array.from(new Set(pacientes.map((p) => p.estado).filter(Boolean)))

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('totalCount', { n: pacientes.length })}</p>
        </div>
        {puedeImportar && (
          <button
            onClick={() => setShowImport(true)}
            className="bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 text-sm font-bold px-4 py-2 rounded-xl"
          >
            📥 {t('importCSV')}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="">{t('filterAllStates')}</option>
          {estados.map((e) => <option key={e} value={e}>{tEstados(e)}</option>)}
        </select>

        <select
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value as 'score' | 'fecha' | 'nombre')}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="fecha">{t('sortNewest')}</option>
          <option value="score">{t('sortScore')}</option>
          <option value="nombre">{t('sortName')}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-400">{t('noResults')}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <div className="bg-[--bg-card] border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-widest">
                    <th className="text-left px-4 py-3">{t('table.patient')}</th>
                    <th className="text-left px-4 py-3">{t('table.phone')}</th>
                    <th className="text-left px-4 py-3">{t('table.stateCRM')}</th>
                    <th className="text-left px-4 py-3 w-36">{t('table.score')}</th>
                    <th className="text-left px-4 py-3">{t('table.registered')}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtrados.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[.02] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/pacientes/${p.id}`} className="text-white font-medium hover:text-teal-400 transition-colors">
                          {p.nombre ?? '—'}
                        </Link>
                        {p.email && <p className="text-slate-500 text-xs">{p.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${p.telefono?.replace(/\D/g, '')}`}
                          target="_blank"
                          className="text-slate-300 hover:text-green-400 transition-colors font-mono text-xs"
                        >
                          {p.telefono}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${estadoColor[p.estado] ?? 'text-slate-500'}`}>
                          {p.estado ? tEstados(p.estado) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={p.score} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatFecha(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${p.telefono?.replace(/\D/g, '')}`}
                          target="_blank"
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title={t('whatsAppContact')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.25.626 4.35 1.714 6.126L.057 23.882l5.9-1.548A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.504.92.936-3.41-.234-.37A9.818 9.818 0 112 12c0-5.422 4.396-9.818 9.818-9.818S21.636 6.578 21.636 12 17.24 21.818 12 21.818z"/>
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {filtrados.map((p) => (
              <Link href={`/admin/pacientes/${p.id}`} key={p.id} className="block bg-[--bg-card] border border-white/5 rounded-xl p-4 hover:border-teal-500/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-bold">{p.nombre ?? '—'}</p>
                    <p className="text-slate-400 text-sm font-mono">{p.telefono}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${estadoColor[p.estado] ?? 'text-slate-500'}`}>
                    {p.estado ? tEstados(p.estado) : '—'}
                  </span>
                </div>
                <ScoreBar score={p.score} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-600 text-xs">{formatFecha(p.created_at)}</span>
                  <a
                    href={`https://wa.me/${p.telefono?.replace(/\D/g, '')}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-green-400 text-xs font-bold hover:text-green-300 transition-colors"
                  >
                    {t('whatsapp')} →
                  </a>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[--bg-card] border border-white/10 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-white">{t('import.title')}</h2>
                <p className="text-slate-500 text-xs mt-0.5">{t('import.subtitle')}</p>
              </div>
              <button onClick={cerrarImport} className="text-slate-500 hover:text-white text-xl">×</button>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-3 text-xs text-slate-400 mb-4 font-mono">
              {t('import.example')}<br/>
              <span className="text-teal-400">nombre,telefono,email,notas</span><br/>
              <span className="text-slate-500">Juan Pérez,+5491155551111,juan@x.com,Caries</span><br/>
              <span className="text-slate-500">María Lopez,+541144443333,,</span>
            </div>

            {!importResult ? (
              <form onSubmit={handleImport} className="space-y-3">
                <input
                  type="file"
                  name="archivo"
                  accept=".csv,text/csv"
                  required
                  disabled={importing}
                  className="block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:font-bold hover:file:bg-teal-500 disabled:opacity-50"
                />
                {importError && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{importError}</p>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={cerrarImport}
                    disabled={importing}
                    className="text-slate-400 hover:text-white text-sm px-4 py-2"
                  >
                    {t('import.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-50"
                  >
                    {importing ? t('import.importing') : t('import.submit')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-2xl font-black text-emerald-400 number-display">{importResult.creados}</p>
                    <p className="text-xs text-slate-400">{t('import.created')}</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                    <p className="text-2xl font-black text-yellow-400 number-display">{importResult.duplicados_omitidos}</p>
                    <p className="text-xs text-slate-400">{t('import.duplicates')}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                    <p className="text-2xl font-black text-rose-400 number-display">{importResult.sin_contacto_omitidos + importResult.errores.length}</p>
                    <p className="text-xs text-slate-400">{t('import.skipped')}</p>
                  </div>
                </div>
                {importResult.errores.length > 0 && (
                  <details className="text-xs">
                    <summary className="text-slate-400 cursor-pointer">{t('import.viewErrors', { n: importResult.errores.length })}</summary>
                    <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto bg-slate-900/60 rounded-lg p-3">
                      {importResult.errores.map((er, i) => (
                        <li key={i} className="text-slate-500">
                          <span className="text-rose-400">L{er.fila}:</span> {er.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={cerrarImport}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2 rounded-xl"
                  >
                    {t('import.close')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
