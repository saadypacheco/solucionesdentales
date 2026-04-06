'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { getPacientesAdmin, patchPacienteEstado, type Paciente } from '@/lib/api/admin'

/* ─── COLUMNAS DEL PIPELINE ─── */
const COLUMNAS = [
  { id: 'nuevo',           label: 'Nuevo',          icono: '🆕', color: 'border-blue-500/30 bg-blue-500/5' },
  { id: 'contactado',      label: 'Contactado',      icono: '📞', color: 'border-purple-500/30 bg-purple-500/5' },
  { id: 'interesado',      label: 'Interesado',      icono: '🎯', color: 'border-orange-500/30 bg-orange-500/5' },
  { id: 'turno_agendado',  label: 'Turno agendado',  icono: '📅', color: 'border-teal-500/30 bg-teal-500/5' },
  { id: 'paciente_activo', label: 'Paciente activo', icono: '✅', color: 'border-green-500/30 bg-green-500/5' },
  { id: 'inactivo',        label: 'Inactivo',        icono: '💤', color: 'border-slate-500/30 bg-slate-500/5' },
  { id: 'perdido',         label: 'Perdido',         icono: '❌', color: 'border-red-500/30 bg-red-500/5' },
]

const scoreColor = (s: number) => s >= 60 ? 'text-green-400' : s >= 30 ? 'text-yellow-400' : 'text-slate-500'

/* ─── TARJETA ─── */
function TarjetaPaciente({
  paciente,
  columnas,
  onMover,
}: {
  paciente: Paciente
  columnas: { id: string; label: string }[]
  onMover: (id: number, estado: string) => Promise<void>
}) {
  const [moviendo, setMoviendo] = useState(false)

  async function mover(estado: string) {
    setMoviendo(true)
    await onMover(paciente.id, estado)
    setMoviendo(false)
  }

  return (
    <div className="bg-[#0c1624] border border-white/5 rounded-xl p-3 text-sm group">
      <div className="flex items-start justify-between mb-1">
        <p className="text-white font-bold leading-tight">{paciente.nombre ?? '—'}</p>
        <span className={`font-bold text-xs ${scoreColor(paciente.score)}`}>
          {paciente.score}pts
        </span>
      </div>
      <p className="text-slate-500 text-xs font-mono mb-3">{paciente.telefono}</p>

      <div className="flex gap-1.5">
        <a
          href={`https://wa.me/${paciente.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${paciente.nombre ?? ''}!`)}`}
          target="_blank"
          className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg py-1.5 text-xs font-bold text-center transition-colors"
        >
          WhatsApp
        </a>
        <select
          disabled={moviendo}
          value={paciente.estado}
          onChange={(e) => mover(e.target.value)}
          className="flex-1 bg-slate-800 border border-white/5 text-slate-400 rounded-lg px-1 py-1 text-xs focus:outline-none focus:border-teal-500 disabled:opacity-50"
        >
          {columnas.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

/* ─── PAGE ─── */
export default function AdminCRMPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    getPacientesAdmin(token).then(setPacientes).finally(() => setLoading(false))
  }, [token, router])

  async function moverPaciente(id: number, estado: string) {
    if (!token) return
    const actualizado = await patchPacienteEstado(token, id, estado)
    setPacientes((prev) => prev.map((p) => p.id === id ? actualizado : p))
  }

  function pacientesDe(estado: string) {
    let lista = pacientes.filter((p) => p.estado === estado)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter((p) => p.nombre?.toLowerCase().includes(q) || p.telefono?.includes(q))
    }
    return lista.sort((a, b) => b.score - a.score)
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">CRM / Pipeline</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pacientes.length} pacientes totales</p>
        </div>
        <div className="relative sm:w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">Cargando pipeline...</div>
      ) : (
        /* Kanban horizontal scroll */
        <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '70vh' }}>
          {COLUMNAS.map((col) => {
            const lista = pacientesDe(col.id)
            return (
              <div
                key={col.id}
                className={`flex-shrink-0 w-60 rounded-2xl border ${col.color} p-3 flex flex-col`}
              >
                {/* Cabecera columna */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span>{col.icono}</span>
                    <span className="text-xs font-bold text-white">{col.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
                    {lista.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {lista.length === 0 ? (
                    <div className="text-slate-700 text-xs text-center py-6">—</div>
                  ) : (
                    lista.map((p) => (
                      <TarjetaPaciente
                        key={p.id}
                        paciente={p}
                        columnas={COLUMNAS}
                        onMover={moverPaciente}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Leyenda score */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
        <span>Score: <span className="text-green-400 font-bold">≥60 caliente</span></span>
        <span><span className="text-yellow-400 font-bold">30-59 tibio</span></span>
        <span><span className="text-slate-500 font-bold">&lt;30 frío</span></span>
      </div>
    </div>
  )
}
