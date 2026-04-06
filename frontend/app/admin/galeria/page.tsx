'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { getCasosAdmin, aprobarCaso, eliminarCaso, crearCaso, type Caso } from '@/lib/api/casos'

const TRATAMIENTOS = [
  'estetica', 'blanqueamiento', 'ortodoncia', 'implante', 'limpieza', 'urgencia', 'consulta',
]

function BadgeEstado({ aprobado }: { aprobado: boolean }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
      aprobado ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
    }`}>
      {aprobado ? 'Publicado' : 'Pendiente'}
    </span>
  )
}

/* ─── MODAL UPLOAD ─── */
function ModalSubir({ token, onClose, onCreado }: {
  token: string
  onClose: () => void
  onCreado: (c: Caso) => void
}) {
  const [tipo, setTipo] = useState(TRATAMIENTOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [duracion, setDuracion] = useState('')
  const [antes, setAntes] = useState<File | null>(null)
  const [despues, setDespues] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const antesRef = useRef<HTMLInputElement>(null)
  const despuesRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!antes || !despues || !descripcion.trim()) return
    setSubiendo(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('tipo_tratamiento', tipo)
      fd.append('descripcion', descripcion.trim())
      fd.append('duracion_tratamiento', duracion.trim())
      fd.append('imagen_antes', antes)
      fd.append('imagen_despues', despues)
      const caso = await crearCaso(token, fd)
      onCreado(caso)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setSubiendo(false)
    }
  }

  function PreviewImg({ file, label }: { file: File | null; label: string }) {
    const [url, setUrl] = useState<string>('')
    useEffect(() => {
      if (!file) return
      const u = URL.createObjectURL(file)
      setUrl(u)
      return () => URL.revokeObjectURL(u)
    }, [file])
    if (!url) return null
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={label} className="w-full h-28 object-cover rounded-lg mt-2" />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0c1624] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Subir caso</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tratamiento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
            >
              {TRATAMIENTOS.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Describe el caso brevemente..."
              required
              className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Duración (opcional)</label>
            <input
              type="text"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              placeholder="Ej: 3 meses, 1 sesión..."
              className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Foto ANTES</label>
              <button
                type="button"
                onClick={() => antesRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl py-4 text-sm transition-colors ${
                  antes ? 'border-teal-500 text-teal-400' : 'border-white/10 text-slate-500 hover:border-teal-500/50'
                }`}
              >
                {antes ? antes.name.slice(0, 16) + '…' : '+ Subir foto'}
              </button>
              <input ref={antesRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => setAntes(e.target.files?.[0] ?? null)} />
              <PreviewImg file={antes} label="antes" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Foto DESPUÉS</label>
              <button
                type="button"
                onClick={() => despuesRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl py-4 text-sm transition-colors ${
                  despues ? 'border-teal-500 text-teal-400' : 'border-white/10 text-slate-500 hover:border-teal-500/50'
                }`}
              >
                {despues ? despues.name.slice(0, 16) + '…' : '+ Subir foto'}
              </button>
              <input ref={despuesRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => setDespues(e.target.files?.[0] ?? null)} />
              <PreviewImg file={despues} label="despues" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-white/10 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:border-white/20 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!antes || !despues || !descripcion.trim() || subiendo}
              className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-teal-500 transition-colors"
            >
              {subiendo ? 'Subiendo...' : 'Subir caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── PAGE ─── */
export default function AdminGaleriaPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [casos, setCasos] = useState<Caso[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [accionando, setAccionando] = useState<number | null>(null)

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    getCasosAdmin(token).then(setCasos).finally(() => setLoading(false))
  }, [token, router])

  async function toggleAprobado(caso: Caso) {
    if (!token) return
    setAccionando(caso.id)
    try {
      const actualizado = await aprobarCaso(token, caso.id, !caso.aprobado)
      setCasos((prev) => prev.map((c) => c.id === caso.id ? actualizado : c))
    } finally {
      setAccionando(null)
    }
  }

  async function handleEliminar(id: number) {
    if (!token || !confirm('¿Eliminar este caso?')) return
    await eliminarCaso(token, id)
    setCasos((prev) => prev.filter((c) => c.id !== id))
  }

  const pendientes = casos.filter((c) => !c.aprobado)
  const publicados = casos.filter((c) => c.aprobado)

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Galería de casos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {publicados.length} publicados · {pendientes.length} pendientes
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Subir caso
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">Cargando...</div>
      ) : casos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🖼️</p>
          <p className="text-slate-400">No hay casos todavía. Subí el primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {casos.map((caso) => (
            <div key={caso.id} className="bg-[--bg-card] border border-white/5 rounded-2xl overflow-hidden">
              {/* Imágenes */}
              <div className="grid grid-cols-2 gap-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={caso.imagen_antes_url} alt="antes" className="w-full h-32 object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={caso.imagen_despues_url} alt="después" className="w-full h-32 object-cover" />
              </div>
              <div className="grid grid-cols-2 gap-0.5 text-center">
                <span className="bg-black/40 text-xs text-slate-400 py-0.5">ANTES</span>
                <span className="bg-teal-900/40 text-xs text-teal-400 py-0.5">DESPUÉS</span>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-teal-400 tracking-widest">
                    {caso.tipo_tratamiento}
                  </span>
                  <BadgeEstado aprobado={caso.aprobado} />
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">{caso.descripcion}</p>
                {caso.duracion_tratamiento && (
                  <p className="text-slate-500 text-xs mb-4">⏱ {caso.duracion_tratamiento}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAprobado(caso)}
                    disabled={accionando === caso.id}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      caso.aprobado
                        ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {accionando === caso.id ? '...' : caso.aprobado ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    onClick={() => handleEliminar(caso.id)}
                    className="px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors border border-white/5"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && token && (
        <ModalSubir
          token={token}
          onClose={() => setModalOpen(false)}
          onCreado={(c) => setCasos((prev) => [c, ...prev])}
        />
      )}
    </div>
  )
}
