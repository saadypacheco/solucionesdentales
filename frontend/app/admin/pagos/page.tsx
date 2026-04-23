'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { getPagosPendientes, verificarPago } from '@/lib/api/telemedicina'

interface TurnoPago {
  id: number
  fecha_hora: string
  precio: number
  comprobante_url: string
  modalidad: string
  estado_pago: string
  es_primera_consulta: boolean
  pacientes: { id: number; nombre: string; telefono: string | null } | null
}

function localeForDateFormat(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  if (locale === 'en') return 'en-US'
  return 'es-AR'
}

function PagoCard({ turno, onProcesado }: { turno: TurnoPago; onProcesado: () => void }) {
  const t = useTranslations('telemedicina.admin')
  const tTele = useTranslations('telemedicina')
  const locale = useLocale()
  const dateLocale = localeForDateFormat(locale)
  const { token } = useAuthStore()
  const [accion, setAccion] = useState<'aprobado' | 'rechazado' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function ejecutar(aprobado: boolean) {
    if (!token) return
    setEnviando(true); setError('')
    try {
      await verificarPago(token, turno.id, aprobado, !aprobado ? motivo : undefined)
      onProcesado()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorVerificar'))
    } finally {
      setEnviando(false)
    }
  }

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(dateLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-white">{turno.pacientes?.nombre ?? 'Paciente'}</p>
          {turno.pacientes?.telefono && <p className="text-xs text-slate-500 font-mono">{turno.pacientes.telefono}</p>}
          <p className="text-xs text-teal-400 mt-1">
            {turno.es_primera_consulta ? tTele('primeraConsulta') : tTele('seguimiento')} · {fmt(turno.fecha_hora)}
          </p>
        </div>
        <span className="text-xl font-black text-teal-400">${turno.precio}</span>
      </div>

      {turno.comprobante_url && (
        <a href={turno.comprobante_url} target="_blank" className="inline-block text-xs text-teal-400 hover:text-teal-300 underline mb-3">
          📎 {t('verComprobante')}
        </a>
      )}

      {accion === 'rechazado' && (
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={t('motivoPlaceholder')}
          rows={2}
          className="w-full bg-slate-900 border border-white/10 text-white text-sm rounded-lg px-3 py-2 mb-2 resize-none focus:outline-none focus:border-teal-500"
        />
      )}

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="flex gap-2">
        {accion === 'rechazado' ? (
          <>
            <button
              onClick={() => setAccion(null)}
              className="px-3 text-slate-400 text-xs hover:text-white"
            >×</button>
            <button
              onClick={() => ejecutar(false)}
              disabled={enviando}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50"
            >
              {enviando ? t('rechazando') : t('rechazar')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => ejecutar(true)}
              disabled={enviando}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50"
            >
              {enviando ? t('aprobando') : `✓ ${t('aprobar')}`}
            </button>
            <button
              onClick={() => setAccion('rechazado')}
              disabled={enviando}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-sm font-bold py-2 rounded-lg disabled:opacity-50"
            >
              ✗ {t('rechazar')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPagosPage() {
  const t = useTranslations('telemedicina.admin')
  const { token } = useAuthStore()
  const [items, setItems] = useState<TurnoPago[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getPagosPendientes(token) as TurnoPago[]
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div>
        <h1 className="text-2xl font-black text-white">{t('pagosPendientes')}</h1>
        <p className="text-slate-400 text-sm">{t('pagosSubtitle')}</p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-slate-400">{t('noPagos')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((tt) => (
            <PagoCard key={tt.id} turno={tt} onProcesado={cargar} />
          ))}
        </div>
      )}
    </div>
  )
}
