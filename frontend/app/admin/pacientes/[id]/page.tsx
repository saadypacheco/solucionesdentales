'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  getPacientesAdmin,
  getTurnosAdmin,
  type Paciente,
  type TurnoAdmin,
} from '@/lib/api/admin'
import {
  getHistorialAdmin,
  upsertHistorial,
  type Historial,
} from '@/lib/api/historial'
import {
  listarTratamientosAdmin,
  crearTratamiento,
  actualizarTratamiento,
  eliminarTratamiento,
  type Tratamiento,
} from '@/lib/api/tratamientos'
import {
  listarRecetasAdmin,
  type Receta,
} from '@/lib/api/recetas'
import {
  listarRadiografias,
  subirRadiografia,
  eliminarRadiografia,
  type Radiografia,
  type TipoRadiografia,
} from '@/lib/api/radiografias'

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

type Tab = 'info' | 'historial' | 'radiografias' | 'tratamientos' | 'turnos' | 'recetas'

export default function PerfilPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const pacienteId = parseInt(id)
  const t = useTranslations('perfilPaciente')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const router = useRouter()
  const { token, user } = useAuthStore()

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')

  const puedeVerHistorial = user && ['admin', 'odontologo', 'superadmin'].includes(user.rol)

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    getPacientesAdmin(token).then((all) => {
      const p = all.find((x) => x.id === pacienteId)
      setPaciente(p ?? null)
    }).finally(() => setLoading(false))
  }, [token, pacienteId, router])

  if (loading) return <div className="p-10 text-center text-slate-400">{t('loading')}</div>
  if (!paciente) return <div className="p-10 text-center text-red-400">No encontrado</div>

  function fmt(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <Link href="/admin/pacientes" className="text-slate-400 text-sm hover:text-teal-400 transition-colors">
        {t('back')}
      </Link>

      <div>
        <h1 className="text-2xl font-black text-white">{paciente.nombre ?? '—'}</h1>
        <p className="text-slate-400 text-sm">{paciente.telefono} {paciente.email && `· ${paciente.email}`}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
        {(['info', 'historial', 'radiografias', 'tratamientos', 'turnos', 'recetas'] as Tab[]).map((x) => {
          const locked = (x === 'historial' || x === 'radiografias') && !puedeVerHistorial
          return (
            <button
              key={x}
              onClick={() => !locked && setTab(x)}
              disabled={locked}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === x
                  ? 'text-teal-400 border-b-2 border-teal-400'
                  : locked
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              {t(`tabs.${x}`)} {locked && '🔒'}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      {tab === 'info' && <TabInfo paciente={paciente} fmt={fmt} t={t} />}
      {tab === 'historial' && <TabHistorial pacienteId={pacienteId} />}
      {tab === 'radiografias' && <TabRadiografias pacienteId={pacienteId} fmt={fmt} />}
      {tab === 'tratamientos' && <TabTratamientos pacienteId={pacienteId} fmt={fmt} />}
      {tab === 'turnos' && <TabTurnos pacienteId={pacienteId} fmt={fmt} />}
      {tab === 'recetas' && <TabRecetas pacienteId={pacienteId} fmt={fmt} />}
    </div>
  )
}

/* ─── TAB INFO ─── */
function TabInfo({ paciente, fmt, t }: { paciente: Paciente; fmt: (iso: string) => string; t: (key: string) => string }) {
  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
      <div><p className="text-xs text-slate-500">{t('info.telefono')}</p><p className="text-white font-mono">{paciente.telefono ?? '—'}</p></div>
      <div><p className="text-xs text-slate-500">{t('info.email')}</p><p className="text-white">{paciente.email ?? '—'}</p></div>
      <div><p className="text-xs text-slate-500">{t('info.estado')}</p><p className="text-white">{paciente.estado}</p></div>
      <div><p className="text-xs text-slate-500">{t('info.score')}</p><p className="text-white">{paciente.score}</p></div>
      <div><p className="text-xs text-slate-500">{t('info.registrado')}</p><p className="text-white">{fmt(paciente.created_at)}</p></div>
    </div>
  )
}

/* ─── TAB HISTORIAL ─── */
function TabHistorial({ pacienteId }: { pacienteId: number }) {
  const t = useTranslations('historial')
  const { token } = useAuthStore()
  const [h, setH] = useState<Historial | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [alergias, setAlergias] = useState('')
  const [medicacion, setMedicacion] = useState('')
  const [antecedentes, setAntecedentes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const cargar = useCallback(async () => {
    if (!token) return
    try {
      const data = await getHistorialAdmin(token, pacienteId)
      setH(data)
      setAlergias((data.alergias || []).join(', '))
      setMedicacion((data.medicacion || []).join(', '))
      setAntecedentes(data.antecedentes || '')
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('permis')) setError(t('noAccess'))
    } finally { setLoading(false) }
  }, [token, pacienteId, t])

  useEffect(() => { cargar() }, [cargar])

  async function guardar() {
    if (!token) return
    setEnviando(true); setError(''); setOk(false)
    try {
      const updated = await upsertHistorial(token, pacienteId, {
        alergias: alergias.split(',').map((x) => x.trim()).filter(Boolean),
        medicacion: medicacion.split(',').map((x) => x.trim()).filter(Boolean),
        antecedentes: antecedentes.trim() || null,
      })
      setH(updated)
      setEditing(false)
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorSave'))
    } finally { setEnviando(false) }
  }

  if (loading) return <p className="text-slate-400 text-center py-10">{t('loading')}</p>

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">{t('title')}</h2>
          <p className="text-xs text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {ok && <span className="text-green-400 text-xs">✓ {t('saved')}</span>}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-teal-400 border border-teal-500/30 px-3 py-1.5 rounded-lg hover:bg-teal-500/10">
              {t('edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); cargar() }} className="text-xs text-slate-400 border border-white/10 px-3 py-1.5 rounded-lg">{t('cancel')}</button>
              <button onClick={guardar} disabled={enviando} className="text-xs text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg font-bold disabled:opacity-50">
                {enviando ? t('saving') : t('save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('alergias')}</label>
        {editing ? (
          <input value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder={t('alergiasPlaceholder')}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
        ) : (
          <p className="text-slate-300 text-sm">{(h?.alergias || []).join(' · ') || <span className="text-slate-600 italic">{t('vacio')}</span>}</p>
        )}
        {editing && <p className="text-[10px] text-slate-600 mt-1">{t('alergiasHint')}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('medicacion')}</label>
        {editing ? (
          <input value={medicacion} onChange={(e) => setMedicacion(e.target.value)} placeholder={t('medicacionPlaceholder')}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
        ) : (
          <p className="text-slate-300 text-sm">{(h?.medicacion || []).join(' · ') || <span className="text-slate-600 italic">{t('vacio')}</span>}</p>
        )}
        {editing && <p className="text-[10px] text-slate-600 mt-1">{t('medicacionHint')}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('antecedentes')}</label>
        {editing ? (
          <textarea value={antecedentes} onChange={(e) => setAntecedentes(e.target.value)} placeholder={t('antecedentesPlaceholder')} rows={4}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 resize-y" />
        ) : (
          <pre className="text-slate-300 text-sm whitespace-pre-wrap">{h?.antecedentes || <span className="text-slate-600 italic">{t('vacio')}</span>}</pre>
        )}
      </div>
    </div>
  )
}

/* ─── TAB TRATAMIENTOS ─── */
function TabTratamientos({ pacienteId, fmt }: { pacienteId: number; fmt: (iso: string) => string }) {
  const t = useTranslations('tratamientos')
  const { token, user } = useAuthStore()
  const [items, setItems] = useState<Tratamiento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [estado, setEstado] = useState('planificado')
  const [costo, setCosto] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const puedeEditar = user && ['admin', 'odontologo', 'superadmin'].includes(user.rol)

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try { setItems(await listarTratamientosAdmin(token, pacienteId)) } catch { /* */ }
    setLoading(false)
  }, [token, pacienteId])

  useEffect(() => { cargar() }, [cargar])

  async function submit() {
    if (!token || !descripcion.trim()) return
    setEnviando(true); setError('')
    try {
      await crearTratamiento(token, {
        paciente_id: pacienteId,
        descripcion: descripcion.trim(),
        fecha,
        estado,
        costo: costo ? parseFloat(costo) : undefined,
        notas: notas.trim() || undefined,
      })
      setDescripcion(''); setCosto(''); setNotas(''); setEstado('planificado')
      setShowForm(false)
      await cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('form.errorCreate'))
    } finally { setEnviando(false) }
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    if (!token) return
    await actualizarTratamiento(token, id, { estado: nuevoEstado })
    setItems((prev) => prev.map((tt) => tt.id === id ? { ...tt, estado: nuevoEstado as Tratamiento['estado'] } : tt))
  }

  async function eliminar(id: number) {
    if (!token || !confirm(t('card.confirmDelete'))) return
    await eliminarTratamiento(token, id)
    setItems((prev) => prev.filter((tt) => tt.id !== id))
  }

  if (loading) return <p className="text-slate-400 text-center py-10">{t('loading')}</p>

  return (
    <div className="space-y-3">
      {puedeEditar && !showForm && (
        <button onClick={() => setShowForm(true)} className="text-sm bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2 rounded-xl">
          {t('nuevo')}
        </button>
      )}

      {showForm && (
        <div className="bg-[--bg-card] border border-teal-500/30 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white">{t('form.title')}</h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('form.descripcion')}</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={t('form.descripcionPlaceholder')}
              className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('form.fecha')}</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('form.estado')}</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
                <option value="planificado">{t('estados.planificado')}</option>
                <option value="en_curso">{t('estados.en_curso')}</option>
                <option value="completado">{t('estados.completado')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('form.costo')}</label>
              <input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder={t('form.costoPlaceholder')}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('form.notas')}</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder={t('form.notasPlaceholder')} rows={2}
              className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 resize-y" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-white/10 text-slate-300 py-2 rounded-lg text-sm">Cancelar</button>
            <button onClick={submit} disabled={enviando || !descripcion.trim()} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50">
              {enviando ? t('form.submitting') : t('form.submit')}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-slate-400 text-center py-10">{t('noTratamientos')}</p>
      ) : items.map((tt) => (
        <div key={tt.id} className="bg-[--bg-card] border border-white/5 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <p className="font-bold text-white">{tt.descripcion}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('card.fecha', { fecha: fmt(tt.fecha) })}
                {tt.usuarios && ` · ${t('card.porOdontologo', { nombre: tt.usuarios.nombre })}`}
              </p>
            </div>
            <select
              value={tt.estado}
              disabled={!puedeEditar}
              onChange={(e) => cambiarEstado(tt.id, e.target.value)}
              className={`text-xs font-bold px-2 py-1 rounded-full border-0 outline-none ${
                tt.estado === 'completado' ? 'bg-green-500/15 text-green-400'
                : tt.estado === 'en_curso' ? 'bg-yellow-500/15 text-yellow-400'
                : 'bg-slate-500/15 text-slate-400'
              }`}
            >
              <option value="planificado">{t('estados.planificado')}</option>
              <option value="en_curso">{t('estados.en_curso')}</option>
              <option value="completado">{t('estados.completado')}</option>
            </select>
          </div>
          {tt.costo !== null && tt.costo !== undefined && (
            <p className="text-xs text-teal-400 mb-1">{t('card.costo', { moneda: 'ARS', costo: tt.costo })}</p>
          )}
          {tt.notas && <p className="text-xs text-slate-500 bg-slate-900/40 rounded p-2 font-mono whitespace-pre-wrap">{tt.notas}</p>}
          {puedeEditar && (
            <button onClick={() => eliminar(tt.id)} className="text-xs text-red-400 hover:text-red-300 mt-2">
              {t('card.delete')}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── TAB TURNOS ─── */
function TabTurnos({ pacienteId, fmt }: { pacienteId: number; fmt: (iso: string) => string }) {
  const { token } = useAuthStore()
  const [items, setItems] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    getTurnosAdmin(token)
      .then((all) => setItems(all.filter((x) => x.paciente_id === pacienteId).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora))))
      .finally(() => setLoading(false))
  }, [token, pacienteId])

  if (loading) return <p className="text-slate-400 text-center py-10">Cargando...</p>
  if (items.length === 0) return <p className="text-slate-400 text-center py-10">Sin turnos</p>

  return (
    <div className="space-y-2">
      {items.map((tt) => (
        <div key={tt.id} className="bg-[--bg-card] border border-white/5 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-semibold">{tt.tipo_tratamiento}</p>
            <p className="text-xs text-slate-500">{fmt(tt.fecha_hora)}</p>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            tt.estado === 'confirmado' ? 'bg-green-500/15 text-green-400'
            : tt.estado === 'realizado' ? 'bg-slate-500/15 text-slate-400'
            : tt.estado === 'cancelado' ? 'bg-red-500/15 text-red-400'
            : 'bg-yellow-500/15 text-yellow-400'
          }`}>{tt.estado}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── TAB RECETAS ─── */
function TabRecetas({ pacienteId, fmt }: { pacienteId: number; fmt: (iso: string) => string }) {
  const { token } = useAuthStore()
  const [items, setItems] = useState<Receta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    listarRecetasAdmin(token, pacienteId).then(setItems).finally(() => setLoading(false))
  }, [token, pacienteId])

  if (loading) return <p className="text-slate-400 text-center py-10">Cargando...</p>
  if (items.length === 0) return <p className="text-slate-400 text-center py-10">Sin recetas</p>

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="bg-[--bg-card] border border-white/5 rounded-xl p-3">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs text-slate-500">{fmt(r.created_at)}</p>
            {r.pdf_url && <a href={r.pdf_url} target="_blank" className="text-xs text-teal-400 hover:text-teal-300">📄 PDF</a>}
          </div>
          <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono bg-slate-900/40 rounded p-2 max-h-32 overflow-y-auto">
            {r.contenido}
          </pre>
        </div>
      ))}
    </div>
  )
}

/* ─── TAB RADIOGRAFÍAS ─── */
const TIPOS_RX: TipoRadiografia[] = ['panoramica', 'periapical', 'bitewing', 'lateral', 'cefalometrica', 'otra']

function esImagenRx(url: string): boolean {
  return /\.(jpe?g|png|webp)(\?|$)/i.test(url)
}

function TabRadiografias({ pacienteId, fmt }: { pacienteId: number; fmt: (iso: string) => string }) {
  const t = useTranslations('radiografias')
  const tCommon = useTranslations('common')
  const { token } = useAuthStore()
  const [items, setItems] = useState<Radiografia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipo, setTipo] = useState<TipoRadiografia>('panoramica')
  const [fechaToma, setFechaToma] = useState('')
  const [notas, setNotas] = useState('')

  const cargar = useCallback(async () => {
    if (!token) return
    try { setItems(await listarRadiografias(token, pacienteId)) } catch { /* */ }
    setLoading(false)
  }, [token, pacienteId])

  useEffect(() => { cargar() }, [cargar])

  async function subir(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !archivo) return
    setSubiendo(true)
    setError('')
    try {
      await subirRadiografia(token, { paciente_id: pacienteId, tipo, fecha_toma: fechaToma || undefined, notas: notas || undefined, archivo })
      setArchivo(null); setTipo('panoramica'); setFechaToma(''); setNotas('')
      setShowForm(false)
      await cargar()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorUpload'))
    } finally {
      setSubiendo(false)
    }
  }

  async function borrar(id: number) {
    if (!token || !confirm(t('confirmDelete'))) return
    try {
      await eliminarRadiografia(token, id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch { /* */ }
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold">{t('title')}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 text-xs font-bold px-3 py-1.5 rounded-lg"
        >
          {showForm ? tCommon('cancel') : `+ ${t('upload')}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={subir} className="bg-slate-900/40 rounded-xl p-4 space-y-3 border border-white/5">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{t('fields.tipo')}</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoRadiografia)}
                className="w-full bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
              >
                {TIPOS_RX.map((tp) => <option key={tp} value={tp}>{t(`tipos.${tp}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{t('fields.fechaToma')}</label>
              <input
                type="date"
                value={fechaToma}
                onChange={(e) => setFechaToma(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{t('fields.archivo')}</label>
              <input
                type="file"
                accept="image/*,.pdf,.dcm"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                required
                className="block w-full text-sm text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-teal-600 file:text-white file:font-bold hover:file:bg-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{t('fields.notas')}</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder={t('fields.notasPlaceholder')}
              className="w-full bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 placeholder:text-slate-600 resize-none"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={subiendo || !archivo}
              className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {subiendo ? t('uploading') : t('uploadSubmit')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm py-6 text-center">{tCommon('loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500 text-sm py-6 text-center">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((r) => (
            <div key={r.id} className="bg-slate-900/40 rounded-xl overflow-hidden border border-white/5">
              <a href={r.archivo_url} target="_blank" rel="noopener noreferrer" className="block bg-black">
                {esImagenRx(r.archivo_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.archivo_url} alt={r.tipo} className="w-full h-40 object-cover hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center text-slate-500 text-sm">
                    📄 {r.archivo_url.split('.').pop()?.toUpperCase()}
                  </div>
                )}
              </a>
              <div className="p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-teal-400 font-bold uppercase tracking-wider">{t(`tipos.${r.tipo}`)}</span>
                  <button
                    onClick={() => borrar(r.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
                {r.fecha_toma && <p className="text-slate-400">📅 {fmt(r.fecha_toma)}</p>}
                {r.notas && <p className="text-slate-500 line-clamp-2">{r.notas}</p>}
                <p className="text-slate-600 text-[10px]">
                  {r.usuarios?.nombre ? `${r.usuarios.nombre} · ` : ''}{fmt(r.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
