'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import {
  obtenerConsultorio,
  listarDocumentosConsultorio,
  revisarDocumento,
} from '@/lib/api/superadmin'
import { getStaff, createStaff, type StaffUserDetailed } from '@/lib/api/admin'
import type { ConsultorioFull, DocumentoConsultorio } from '@/lib/api/consultorios'

const ESTADO_BADGE: Record<string, string> = {
  pendiente_revision: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  aprobado: 'bg-green-500/15 text-green-400 border-green-500/30',
  rechazado: 'bg-red-500/15 text-red-400 border-red-500/30',
  vencido: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

function DocumentoRow({
  doc,
  onRevisado,
}: {
  doc: DocumentoConsultorio
  onRevisado: () => Promise<void>
}) {
  const t = useTranslations('superadmin.consultorio.review')
  const tEstados = useTranslations('admin.compliance.doc')
  const { token } = useAuthStore()
  const [accion, setAccion] = useState<'aprobado' | 'rechazado' | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function ejecutar() {
    if (!token || !accion) return
    setEnviando(true)
    setError('')
    try {
      await revisarDocumento(token, doc.id, accion, observaciones || undefined)
      setAccion(null)
      setObservaciones('')
      await onRevisado()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorReview'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={`bg-[--bg-card] border rounded-2xl p-4 ${ESTADO_BADGE[doc.estado] ?? 'border-white/5'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">{doc.tipo_documento}</h3>
          <p className="text-slate-500 text-xs mt-0.5">
            {new Date(doc.fecha_subida).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${ESTADO_BADGE[doc.estado] ?? ''}`}>
          {tEstados(doc.estado)}
        </span>
      </div>

      {doc.archivo_url && (
        <a href={doc.archivo_url} target="_blank" className="text-xs text-teal-400 hover:text-teal-300">
          📄 Abrir
        </a>
      )}

      {doc.observaciones && (
        <p className="text-xs text-slate-400 mt-2 bg-slate-900/40 rounded p-2">
          {doc.observaciones}
        </p>
      )}

      {doc.estado === 'pendiente_revision' && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {accion && (
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={t('observationsPlaceholder')}
              rows={2}
              className="w-full bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-teal-500"
            />
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            {accion === 'aprobado' || accion === null ? (
              <button
                onClick={() => accion === 'aprobado' ? ejecutar() : setAccion('aprobado')}
                disabled={enviando}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50"
              >
                {enviando && accion === 'aprobado' ? t('approving') : t('approve')}
              </button>
            ) : null}
            {accion === 'rechazado' || accion === null ? (
              <button
                onClick={() => accion === 'rechazado' ? ejecutar() : setAccion('rechazado')}
                disabled={enviando}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50"
              >
                {enviando && accion === 'rechazado' ? t('rejecting') : t('reject')}
              </button>
            ) : null}
            {accion && (
              <button
                onClick={() => { setAccion(null); setObservaciones('') }}
                className="px-3 text-slate-400 text-xs hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CrearAdminForm({
  consultorioId,
  onCreado,
  onCancel,
}: {
  consultorioId: number
  onCreado: () => Promise<void>
  onCancel: () => void
}) {
  const t = useTranslations('superadmin.consultorio.admins.form')
  const { token } = useAuthStore()
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'admin' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setEnviando(true)
    setError('')
    try {
      await createStaff(token, {
        email: form.email.trim(),
        password: form.password,
        nombre: form.nombre.trim(),
        rol: form.rol,
        consultorio_id: consultorioId,
      })
      setExito(true)
      await onCreado()
      setTimeout(() => { setExito(false); onCancel() }, 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorCreate'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-[--bg-card] border border-teal-500/30 rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="font-bold text-white">{t('title')}</h3>
        <p className="text-slate-500 text-xs mt-0.5">{t('subtitle')}</p>
      </div>

      {exito && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 text-sm">
          ✓ {t('successHint')}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('nombre')}</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder={t('nombrePlaceholder')}
            required
            autoFocus
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('email')}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={t('emailPlaceholder')}
            required
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('password')}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={t('passwordPlaceholder')}
            required
            minLength={8}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('rol')}</label>
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="admin">admin</option>
            <option value="odontologo">odontologo</option>
            <option value="recepcionista">recepcionista</option>
          </select>
          <p className="text-slate-600 text-xs mt-1">{t('rolHint')}</p>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-white/10 text-slate-300 py-2 rounded-lg text-sm hover:border-white/20"
          >
            ×
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {enviando ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SuperadminConsultorioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('superadmin.consultorio')
  const tAdmins = useTranslations('superadmin.consultorio.admins')
  const { token } = useAuthStore()
  const [consultorio, setConsultorio] = useState<ConsultorioFull | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoConsultorio[]>([])
  const [admins, setAdmins] = useState<StaffUserDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const cargar = useCallback(async () => {
    if (!token) return
    const consultorioId = parseInt(id)
    const [c, d, a] = await Promise.all([
      obtenerConsultorio(token, consultorioId),
      listarDocumentosConsultorio(token, consultorioId),
      getStaff(token, consultorioId),
    ])
    setConsultorio(c)
    setDocumentos(d)
    setAdmins(a)
  }, [token, id])

  useEffect(() => {
    cargar().finally(() => setLoading(false))
  }, [cargar])

  if (loading) {
    return <div className="p-6 text-center text-slate-400">{t('loading')}</div>
  }
  if (!consultorio) return null

  return (
    <div className="p-4 md:p-6 space-y-5">
      <Link href="/superadmin" className="text-slate-400 text-sm hover:text-teal-400 transition-colors">
        ← {t('title', { nombre: '' }).split(' ')[0]}
      </Link>

      <div>
        <h1 className="text-2xl font-black text-white">{t('title', { nombre: consultorio.nombre })}</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {consultorio.pais_codigo} · {consultorio.estado_compliance}
        </p>
      </div>

      {/* Info */}
      <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
        <h2 className="font-bold text-white mb-4">{t('info')}</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          {consultorio.direccion && (<><dt className="text-slate-500">📍</dt><dd className="text-slate-300">{consultorio.direccion}</dd></>)}
          {consultorio.telefono && (<><dt className="text-slate-500">📞</dt><dd className="text-slate-300">{consultorio.telefono}</dd></>)}
          {consultorio.email && (<><dt className="text-slate-500">✉</dt><dd className="text-slate-300">{consultorio.email}</dd></>)}
          {consultorio.wa_numero && (<><dt className="text-slate-500">💬</dt><dd className="text-slate-300">{consultorio.wa_numero}</dd></>)}
          {consultorio.identificacion_fiscal && (<><dt className="text-slate-500">ID</dt><dd className="text-slate-300">{consultorio.identificacion_fiscal}</dd></>)}
          {consultorio.matricula_titular && (<><dt className="text-slate-500">Mat.</dt><dd className="text-slate-300">{consultorio.matricula_titular}</dd></>)}
        </dl>
      </div>

      {/* Administradores del consultorio */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">{tAdmins('title')}</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              {tAdmins('create')}
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-3">
            <CrearAdminForm
              consultorioId={consultorio.id}
              onCreado={cargar}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {admins.length === 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
            ⚠️ {tAdmins('noAdmins')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {admins.map((u) => (
              <div key={u.id} className="bg-[--bg-card] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-white">{u.nombre}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.rol === 'admin' ? 'bg-purple-500/15 text-purple-400'
                    : u.rol === 'odontologo' ? 'bg-teal-500/15 text-teal-400'
                    : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {u.rol}
                  </span>
                </div>
                <p className="text-slate-500 text-xs">{u.email}</p>
                {!u.activo && <p className="text-red-400 text-xs mt-1">⊘ inactivo</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentos */}
      <div>
        <h2 className="font-bold text-white mb-3">{t('documents')}</h2>
        {documentos.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">{t('noDocuments')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documentos.map((d) => (
              <DocumentoRow key={d.id} doc={d} onRevisado={cargar} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
