'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  getMiChecklist,
  subirDocumento,
  type Checklist,
  type ChecklistItem,
  type EstadoDocumento,
} from '@/lib/api/consultorios'
import DocumentoUpload from '@/components/DocumentoUpload'

const ESTADO_BADGE: Record<EstadoDocumento, string> = {
  no_subido: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  pendiente_revision: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  aprobado: 'bg-green-500/15 text-green-400 border-green-500/30',
  rechazado: 'bg-red-500/15 text-red-400 border-red-500/30',
  vencido: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

const ESTADO_ICON: Record<EstadoDocumento, string> = {
  no_subido: '⏳',
  pendiente_revision: '⏱',
  aprobado: '✓',
  rechazado: '✗',
  vencido: '⚠',
}

function ItemDoc({
  item,
  onUploaded,
}: {
  item: ChecklistItem
  onUploaded: () => Promise<void>
}) {
  const t = useTranslations('admin.compliance.doc')
  const tEstados = useTranslations('admin.compliance.doc')
  const { token } = useAuthStore()
  const [showUpload, setShowUpload] = useState(item.estado === 'no_subido')

  async function handleUpload(file: File, fechaVencimiento?: string) {
    if (!token) return
    await subirDocumento(token, item.tipo_documento, file, fechaVencimiento)
    setShowUpload(false)
    await onUploaded()
  }

  return (
    <div className={`bg-[--bg-card] border rounded-2xl p-5 ${ESTADO_BADGE[item.estado].replace('/15', '/0')}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-sm">{item.nombre_display}</h3>
            {item.obligatorio && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('obligatorio')}
              </span>
            )}
          </div>
          {item.descripcion && (
            <p className="text-slate-500 text-xs leading-relaxed">{item.descripcion}</p>
          )}
        </div>
        <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${ESTADO_BADGE[item.estado]}`}>
          {ESTADO_ICON[item.estado]} {tEstados(item.estado)}
        </span>
      </div>

      {item.fecha_subida && (
        <p className="text-xs text-slate-500 mb-1">
          {t('subido', { fecha: new Date(item.fecha_subida).toLocaleDateString() })}
        </p>
      )}
      {item.fecha_vencimiento && (
        <p className="text-xs text-slate-500 mb-1">
          {t('vence', { fecha: new Date(item.fecha_vencimiento).toLocaleDateString() })}
        </p>
      )}

      {item.observaciones && item.estado === 'rechazado' && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 my-2">
          <p className="text-xs font-bold text-red-400 mb-1">{t('obs')}</p>
          <p className="text-xs text-slate-300">{item.observaciones}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {item.archivo_url && (
          <a
            href={item.archivo_url}
            target="_blank"
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            📄 {t('verArchivo')}
          </a>
        )}
        {item.link_tramite && item.estado === 'no_subido' && (
          <a
            href={item.link_tramite}
            target="_blank"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('tramite')}
          </a>
        )}
        {item.estado !== 'no_subido' && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1 rounded-lg transition-colors ml-auto"
          >
            {t('reemplazar')}
          </button>
        )}
      </div>

      {showUpload && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <DocumentoUpload
            onUpload={handleUpload}
            vencimientoMeses={item.vencimiento_meses}
            initialFile={item.archivo_url}
          />
        </div>
      )}
    </div>
  )
}

export default function CompliancePage() {
  const t = useTranslations('admin.compliance')
  const router = useRouter()
  const locale = useLocale()
  const { token, consultorio } = useAuthStore()
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!token) return
    try {
      const data = await getMiChecklist(token, locale)
      setChecklist(data)
    } finally {
      setLoading(false)
    }
  }, [token, locale])

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    cargar()
  }, [token, cargar, router])

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400">{t('loading')}</div>
    )
  }
  if (!checklist) return null

  const { resumen } = checklist

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div>
        <h1 className="text-2xl font-black text-white">{t('title')}</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {t('subtitle', { pais: consultorio?.paises?.nombre ?? checklist.pais })}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-4">
          <p className="text-xs text-slate-500">{t('summary', { aprobados: resumen.aprobados, total: resumen.total })}</p>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${(resumen.aprobados / Math.max(1, resumen.total)) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-4">
          <p className="text-xs text-slate-500">{t('obligatorios', { aprobados: resumen.obligatorios_aprobados, total: resumen.obligatorios_total })}</p>
          <p className={`text-xl font-black mt-1 ${resumen.completo ? 'text-green-400' : 'text-yellow-400'}`}>
            {resumen.completo ? t('complete') : t('incomplete', { n: resumen.obligatorios_total - resumen.obligatorios_aprobados })}
          </p>
        </div>
        <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-4 col-span-2">
          <p className="text-xs text-slate-500">{t('estadoConsultorio', { estado: t(`estados.${checklist.estado_compliance_actual}`) })}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span className="text-green-400">✓ {resumen.aprobados}</span>
            <span className="text-yellow-400">⏱ {resumen.pendientes}</span>
            <span className="text-red-400">✗ {resumen.rechazados}</span>
            <span className="text-orange-400">⚠ {resumen.vencidos}</span>
            <span className="text-slate-500">⏳ {resumen.faltantes}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checklist.items.map((item) => (
          <ItemDoc key={item.tipo_documento} item={item} onUploaded={cargar} />
        ))}
      </div>
    </div>
  )
}
