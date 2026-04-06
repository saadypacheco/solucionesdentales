'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { getPacientesAdmin, type Paciente } from '@/lib/api/admin'

const estadoColor: Record<string, string> = {
  nuevo:           'bg-blue-500/15 text-blue-400',
  contactado:      'bg-purple-500/15 text-purple-400',
  interesado:      'bg-orange-500/15 text-orange-400',
  turno_agendado:  'bg-teal-500/15 text-teal-400',
  paciente_activo: 'bg-green-500/15 text-green-400',
  inactivo:        'bg-slate-500/15 text-slate-500',
  perdido:         'bg-red-500/15 text-red-400',
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

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })
}

/* ─── PAGE ─── */
export default function AdminPacientesPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<'score' | 'fecha' | 'nombre'>('fecha')

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Pacientes</h1>
        <p className="text-slate-400 text-sm mt-0.5">{pacientes.length} total</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="">Todos los estados</option>
          {estados.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <select
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value as 'score' | 'fecha' | 'nombre')}
          className="bg-slate-800/60 border border-white/10 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="fecha">Más recientes</option>
          <option value="score">Mayor score</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-slate-400 text-center py-20">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-400">No hay pacientes que coincidan</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="bg-[--bg-card] border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-widest">
                    <th className="text-left px-4 py-3">Paciente</th>
                    <th className="text-left px-4 py-3">Teléfono</th>
                    <th className="text-left px-4 py-3">Estado CRM</th>
                    <th className="text-left px-4 py-3 w-36">Score</th>
                    <th className="text-left px-4 py-3">Registro</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtrados.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{p.nombre ?? '—'}</p>
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
                          {p.estado ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={p.score} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatFecha(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${p.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${p.nombre ?? ''}!`)}`}
                          target="_blank"
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="Contactar por WhatsApp"
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtrados.map((p) => (
              <div key={p.id} className="bg-[--bg-card] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-bold">{p.nombre ?? '—'}</p>
                    <p className="text-slate-400 text-sm font-mono">{p.telefono}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${estadoColor[p.estado] ?? 'text-slate-500'}`}>
                    {p.estado ?? '—'}
                  </span>
                </div>
                <ScoreBar score={p.score} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-600 text-xs">{formatFecha(p.created_at)}</span>
                  <a
                    href={`https://wa.me/${p.telefono?.replace(/\D/g, '')}`}
                    target="_blank"
                    className="text-green-400 text-xs font-bold hover:text-green-300 transition-colors"
                  >
                    WhatsApp →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
