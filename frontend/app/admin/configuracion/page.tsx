'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import {
  getConfigIA, patchConfigIA, ejecutarSeguimiento,
  type ConfigIA, type SeguimientoResultado,
} from '@/lib/api/admin'
import {
  getMiConsultorio, actualizarMiConsultorio,
  listarMisDominios, agregarDominio, quitarDominio,
  type ConsultorioFull, type MiConsultorioPatch, type DominioConsultorio,
} from '@/lib/api/consultorios'

function SeccionConfig({
  titulo, descripcion, clave, valor, token, onGuardado, tipo = 'textarea',
}: {
  titulo: string
  descripcion: string
  clave: string
  valor: string
  token: string
  onGuardado: (clave: string, valor: string) => void
  tipo?: 'textarea' | 'input'
}) {
  const t = useTranslations('admin.configuracion')
  const tCommon = useTranslations('common')
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState(valor)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => { setDraft(valor) }, [valor])

  async function guardar() {
    setGuardando(true)
    try {
      await patchConfigIA(token, clave, draft)
      onGuardado(clave, draft)
      setEditando(false)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-bold">{titulo}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{descripcion}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {ok && <span className="text-green-400 text-xs font-bold">✓ {tCommon('saved')}</span>}
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-teal-400 hover:text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              {tCommon('edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setDraft(valor); setEditando(false) }}
                className="text-xs text-slate-400 hover:text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="text-xs text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors font-bold"
              >
                {guardando ? tCommon('saving') : tCommon('save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {editando ? (
        tipo === 'textarea' ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            autoFocus
            className="w-full bg-slate-900 border border-teal-500/40 text-slate-200 text-sm rounded-xl px-4 py-3 resize-y focus:outline-none focus:border-teal-400 font-mono leading-relaxed"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="w-full bg-slate-900 border border-teal-500/40 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-teal-400"
          />
        )
      ) : (
        <pre className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-slate-900/50 rounded-xl px-4 py-3 max-h-48 overflow-y-auto">
          {valor || <span className="text-slate-600 italic">{t('emptyValue')}</span>}
        </pre>
      )}
    </div>
  )
}

function PanelConsultorio({ token }: { token: string }) {
  const t = useTranslations('admin.configuracion.consultorio')
  const tCommon = useTranslations('common')
  const [data, setData] = useState<ConsultorioFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState<MiConsultorioPatch>({})
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMiConsultorio(token)
      .then((c) => { setData(c); setDraft({}) })
      .finally(() => setLoading(false))
  }, [token])

  async function guardar() {
    if (!data) return
    setGuardando(true)
    setError('')
    try {
      const updated = await actualizarMiConsultorio(token, draft)
      setData(updated)
      setDraft({})
      setEditando(false)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorSave'))
    } finally {
      setGuardando(false)
    }
  }

  function setField<K extends keyof MiConsultorioPatch>(key: K, value: MiConsultorioPatch[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function valorActual<K extends keyof MiConsultorioPatch>(key: K): string {
    const v = draft[key] ?? (data?.[key as keyof ConsultorioFull] as string | null)
    return v ?? ''
  }

  if (loading) return <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5 text-slate-400 text-sm">{tCommon('loading')}</div>

  if (!data) return null

  const campos: { key: keyof MiConsultorioPatch; label: string; type: string; placeholder?: string }[] = [
    { key: 'nombre',             label: t('fields.nombre'),    type: 'text' },
    { key: 'direccion',          label: t('fields.direccion'), type: 'text' },
    { key: 'telefono',           label: t('fields.telefono'),  type: 'tel' },
    { key: 'email',              label: t('fields.email'),     type: 'email' },
    { key: 'wa_numero',          label: t('fields.waNumero'),  type: 'tel', placeholder: '549XXXXXXXXXX' },
    { key: 'matricula_titular',  label: t('fields.matricula'), type: 'text' },
  ]

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold">{t('title')}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{t('desc')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {ok && <span className="text-green-400 text-xs font-bold">✓ {tCommon('saved')}</span>}
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-teal-400 hover:text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              {tCommon('edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setDraft({}); setEditando(false); setError('') }}
                className="text-xs text-slate-400 hover:text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={guardar}
                disabled={guardando || Object.keys(draft).length === 0}
                className="text-xs text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors font-bold"
              >
                {guardando ? tCommon('saving') : tCommon('save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {campos.map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</label>
            {editando ? (
              <input
                type={type}
                value={valorActual(key)}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-900 border border-teal-500/40 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400"
              />
            ) : (
              <p className="text-slate-300 text-sm bg-slate-900/50 rounded-xl px-3 py-2 min-h-[2.25rem]">
                {valorActual(key) || <span className="text-slate-600 italic">{t('emptyField')}</span>}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 grid sm:grid-cols-2 gap-3 text-xs text-slate-500">
        <div>
          <span className="font-bold uppercase tracking-wider">{t('country')}: </span>
          <span className="text-slate-400">{data.paises?.nombre} ({data.pais_codigo})</span>
          <span className="text-slate-600 ml-2">— {t('countryReadOnly')}</span>
        </div>
        <div>
          <span className="font-bold uppercase tracking-wider">{t('complianceState')}: </span>
          <span className="text-slate-400">{data.estado_compliance}</span>
        </div>
      </div>
    </div>
  )
}

function PanelDominios({ token }: { token: string }) {
  const t = useTranslations('admin.configuracion.dominios')
  const tCommon = useTranslations('common')
  const [items, setItems] = useState<DominioConsultorio[]>([])
  const [loading, setLoading] = useState(true)
  const [hostname, setHostname] = useState('')
  const [esDefault, setEsDefault] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    try { setItems(await listarMisDominios(token)) } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [token])  // eslint-disable-line react-hooks/exhaustive-deps

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    if (!hostname.trim()) return
    setAgregando(true)
    setError('')
    try {
      await agregarDominio(token, { hostname: hostname.trim(), es_default: esDefault })
      setHostname(''); setEsDefault(false)
      await cargar()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorAdd'))
    } finally {
      setAgregando(false)
    }
  }

  async function quitar(id: number, hn: string) {
    if (!confirm(t('confirmDelete', { hostname: hn }))) return
    try {
      await quitarDominio(token, id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch { /* */ }
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-white font-bold">{t('title')}</h3>
        <p className="text-slate-500 text-xs mt-0.5">{t('desc')}</p>
      </div>

      <form onSubmit={agregar} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder={t('placeholder')}
          disabled={agregando}
          className="flex-1 bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
        />
        <label className="flex items-center gap-2 text-xs text-slate-400 px-2">
          <input
            type="checkbox"
            checked={esDefault}
            onChange={(e) => setEsDefault(e.target.checked)}
            className="accent-teal-500"
          />
          {t('asDefault')}
        </label>
        <button
          type="submit"
          disabled={!hostname.trim() || agregando}
          className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          {agregando ? t('adding') : t('add')}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-red-400 text-xs mb-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm py-4 text-center">{tCommon('loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500 text-sm py-4 text-center">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-200">{d.hostname}</span>
                {d.es_default && (
                  <span className="text-[10px] font-bold bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full">
                    {t('defaultBadge')}
                  </span>
                )}
                {d.notas && <span className="text-slate-500 text-xs">— {d.notas}</span>}
              </div>
              <button
                onClick={() => quitar(d.id, d.hostname)}
                className="text-rose-400 hover:text-rose-300 text-xs"
              >
                {tCommon('delete')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-slate-600 text-xs mt-4 leading-relaxed">
        💡 {t('hint')}
      </p>
    </div>
  )
}

function PanelSeguimiento({ token }: { token: string }) {
  const t = useTranslations('admin.configuracion.follow')
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado] = useState<SeguimientoResultado | null>(null)
  const [error, setError] = useState('')

  async function ejecutar() {
    setEjecutando(true)
    setError('')
    setResultado(null)
    try {
      const r = await ejecutarSeguimiento(token)
      setResultado(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorExecute'))
    } finally {
      setEjecutando(false)
    }
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold">{t('title')}</h3>
          <p className="text-slate-500 text-xs mt-0.5">
            {t('desc')}
          </p>
        </div>
        <button
          onClick={ejecutar}
          disabled={ejecutando}
          className="flex-shrink-0 ml-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          {ejecutando ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {t('executing')}
            </>
          ) : t('execute')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {resultado && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-green-400 font-bold text-sm mb-3">
            ✓ {t('alarmsGenerated', { n: resultado.alarmas_generadas })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'inactivos',                valor: resultado.detalle.inactivos },
              { key: 'turnos_sin_confirmar',     valor: resultado.detalle.turnos_sin_confirmar },
              { key: 'leads_sin_seguimiento',    valor: resultado.detalle.leads_sin_seguimiento },
              { key: 'tratamientos_incompletos', valor: resultado.detalle.tratamientos_incompletos },
            ].map((item) => (
              <div key={item.key} className="bg-black/20 rounded-lg px-3 py-2">
                <p className="text-slate-400 text-xs">{t(`metric.${item.key}`)}</p>
                <p className="text-white font-black text-xl number-display">{item.valor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-2">{t('rulesTitle')}</p>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>{t('rules.leads')}</li>
          <li>{t('rules.appointments')}</li>
          <li>{t('rules.inactive')}</li>
          <li>{t('rules.incomplete')}</li>
        </ul>
      </div>
    </div>
  )
}

export default function AdminConfiguracionPage() {
  const t = useTranslations('admin.configuracion')
  const router = useRouter()
  const { token } = useAuthStore()
  const [configs, setConfigs] = useState<ConfigIA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    getConfigIA(token).then(setConfigs).finally(() => setLoading(false))
  }, [token, router])

  function getValor(clave: string): string {
    return configs.find((c) => c.clave === clave)?.valor ?? ''
  }

  function handleGuardado(clave: string, valor: string) {
    setConfigs((prev) =>
      prev.some((c) => c.clave === clave)
        ? prev.map((c) => c.clave === clave ? { ...c, valor } : c)
        : [...prev, { clave, valor, updated_at: new Date().toISOString() }]
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div className="mb-2">
        <h1 className="text-2xl font-black text-white">{t('title')}</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {t('subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : (
        <>
          {token && <PanelConsultorio token={token} />}

          {token && <PanelDominios token={token} />}

          {token && <PanelSeguimiento token={token} />}

          <SeccionConfig
            titulo={t('section.agentTitle')}
            descripcion={t('section.agentDesc')}
            clave="system_prompt"
            valor={getValor('system_prompt')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="textarea"
          />

          <SeccionConfig
            titulo={t('section.pricesTitle')}
            descripcion={t('section.pricesDesc')}
            clave="rangos_precios"
            valor={getValor('rangos_precios')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="textarea"
          />

          <SeccionConfig
            titulo={t('section.reminderTitle')}
            descripcion={t('section.reminderDesc')}
            clave="mensaje_recordatorio"
            valor={getValor('mensaje_recordatorio')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="textarea"
          />

          <SeccionConfig
            titulo={t('section.waTitle')}
            descripcion={t('section.waDesc')}
            clave="wa_numero"
            valor={getValor('wa_numero')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="input"
          />
        </>
      )}
    </div>
  )
}
