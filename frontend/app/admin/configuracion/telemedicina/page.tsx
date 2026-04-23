'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { getStaff, type StaffUserDetailed } from '@/lib/api/admin'
import { getPrecios, upsertPrecio, type PrecioConfig } from '@/lib/api/telemedicina'

function PrecioForm({
  odontologo,
  inicial,
  onGuardado,
}: {
  odontologo: StaffUserDetailed
  inicial: PrecioConfig | null
  onGuardado: () => void
}) {
  const t = useTranslations('telemedicina.admin')
  const tCommon = useTranslations('common')
  const { token } = useAuthStore()
  const [precioPrimera, setPrecioPrimera] = useState(inicial?.precio_primera_consulta ?? 0)
  const [precioSeguimiento, setPrecioSeguimiento] = useState(inicial?.precio_seguimiento ?? 0)
  const [moneda, setMoneda] = useState(inicial?.moneda ?? 'ARS')
  const [qrUrl, setQrUrl] = useState(inicial?.qr_pago_url ?? '')
  const [datos, setDatos] = useState(inicial?.datos_transferencia ?? '')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    if (!token) return
    setEnviando(true); setError(''); setOk(false)
    try {
      await upsertPrecio(token, {
        odontologo_id: odontologo.id,
        precio_primera_consulta: precioPrimera,
        precio_seguimiento: precioSeguimiento,
        moneda,
        qr_pago_url: qrUrl || undefined,
        datos_transferencia: datos || undefined,
      })
      setOk(true)
      setTimeout(() => setOk(false), 2500)
      onGuardado()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-white">{odontologo.nombre}</p>
        {ok && <span className="text-green-400 text-xs font-bold">✓ {tCommon('saved')}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {t('preciosPrimera')}
          </label>
          <input
            type="number"
            step="0.01"
            value={precioPrimera}
            onChange={(e) => setPrecioPrimera(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {t('preciosSeguimiento')}
          </label>
          <input
            type="number"
            step="0.01"
            value={precioSeguimiento}
            onChange={(e) => setPrecioSeguimiento(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          {t('preciosMoneda')}
        </label>
        <select
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
          <option value="BOB">BOB</option>
          <option value="BRL">BRL</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          {t('preciosQR')}
        </label>
        <input
          type="url"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
        />
      </div>

      <div className="mb-3">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          {t('preciosTransferencia')}
        </label>
        <textarea
          value={datos}
          onChange={(e) => setDatos(e.target.value)}
          rows={3}
          placeholder={'CBU: ...\nAlias: ...\nTitular: ...'}
          className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 resize-y"
        />
      </div>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <button
        onClick={guardar}
        disabled={enviando}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
      >
        {enviando ? tCommon('saving') : t('preciosGuardar')}
      </button>
    </div>
  )
}

export default function AdminTelemedicinaConfigPage() {
  const t = useTranslations('telemedicina.admin')
  const router = useRouter()
  const { token } = useAuthStore()
  const [odontologos, setOdontologos] = useState<StaffUserDetailed[]>([])
  const [precios, setPrecios] = useState<PrecioConfig[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [staff, p] = await Promise.all([
        getStaff(token),
        getPrecios(token),
      ])
      setOdontologos(staff.filter((u) => ['admin', 'odontologo'].includes(u.rol) && u.activo))
      setPrecios(p)
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (!token) router.push('/admin/login')
  }, [token, router])
  useEffect(() => { cargar() }, [cargar])

  function precioDe(odontologoId: string): PrecioConfig | null {
    return precios.find((p) => p.odontologo_id === odontologoId) ?? null
  }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div>
        <h1 className="text-2xl font-black text-white">{t('preciosTitle')}</h1>
        <p className="text-slate-400 text-sm">{t('preciosDesc')}</p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">{t('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {odontologos.map((o) => (
            <PrecioForm
              key={o.id}
              odontologo={o}
              inicial={precioDe(o.id)}
              onGuardado={cargar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
