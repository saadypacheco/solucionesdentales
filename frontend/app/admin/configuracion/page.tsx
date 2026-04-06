'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import {
  getConfigIA, patchConfigIA, ejecutarSeguimiento,
  type ConfigIA, type SeguimientoResultado,
} from '@/lib/api/admin'

/* ─── Sección editable ─── */
function SeccionConfig({
  titulo, descripcion, clave, valor, token, onGuardado,
  tipo = 'textarea',
}: {
  titulo: string
  descripcion: string
  clave: string
  valor: string
  token: string
  onGuardado: (clave: string, valor: string) => void
  tipo?: 'textarea' | 'input'
}) {
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState(valor)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  // Sync cuando cambia el valor externo
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
          {ok && <span className="text-green-400 text-xs font-bold">✓ Guardado</span>}
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-teal-400 hover:text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setDraft(valor); setEditando(false) }}
                className="text-xs text-slate-400 hover:text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="text-xs text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors font-bold"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
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
          {valor || <span className="text-slate-600 italic">Sin configurar</span>}
        </pre>
      )}
    </div>
  )
}

/* ─── Panel seguimiento ─── */
function PanelSeguimiento({ token }: { token: string }) {
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
      setError(e instanceof Error ? e.message : 'Error al ejecutar')
    } finally {
      setEjecutando(false)
    }
  }

  return (
    <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold">Seguimiento automático</h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Detecta pacientes inactivos, turnos sin confirmar y leads sin seguimiento. Genera alarmas automáticamente.
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
              Ejecutando...
            </>
          ) : '▶ Ejecutar ahora'}
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
            ✓ {resultado.alarmas_generadas} alarma{resultado.alarmas_generadas !== 1 ? 's' : ''} generada{resultado.alarmas_generadas !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pacientes inactivos',      valor: resultado.detalle.inactivos },
              { label: 'Turnos sin confirmar',      valor: resultado.detalle.turnos_sin_confirmar },
              { label: 'Leads sin seguimiento',     valor: resultado.detalle.leads_sin_seguimiento },
              { label: 'Tratamientos incompletos',  valor: resultado.detalle.tratamientos_incompletos },
            ].map((item) => (
              <div key={item.label} className="bg-black/20 rounded-lg px-3 py-2">
                <p className="text-slate-400 text-xs">{item.label}</p>
                <p className="text-white font-black text-xl number-display">{item.valor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-2">Reglas activas</p>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>🔴 Leads sin actividad en +24hs → alarma alta</li>
          <li>🔴 Turnos sin confirmar a menos de 48hs → alarma alta</li>
          <li>🟡 Pacientes activos sin turno hace +6 meses → alarma media</li>
          <li>🟡 Ortodoncia/implantes sin próximo turno → alarma media</li>
        </ul>
      </div>
    </div>
  )
}

/* ─── PAGE ─── */
export default function AdminConfiguracionPage() {
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
        <h1 className="text-2xl font-black text-white">Configuración IA</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Personalizá el agente y ejecutá el seguimiento automático
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">Cargando configuración...</div>
      ) : (
        <>
          {/* Seguimiento */}
          {token && <PanelSeguimiento token={token} />}

          {/* System prompt */}
          <SeccionConfig
            titulo="Personalidad del agente"
            descripcion="System prompt que define cómo responde el agente IA a los pacientes"
            clave="system_prompt"
            valor={getValor('system_prompt')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="textarea"
          />

          {/* Rangos de precios */}
          <SeccionConfig
            titulo="Rangos de precios"
            descripcion="El agente usa estos rangos para orientar a los pacientes sobre costos"
            clave="rangos_precios"
            valor={getValor('rangos_precios')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="textarea"
          />

          {/* Mensaje recordatorio */}
          <SeccionConfig
            titulo="Mensaje de recordatorio WhatsApp"
            descripcion="Plantilla para recordatorios manuales. Variables: {nombre}, {hora}, {tratamiento}"
            clave="mensaje_recordatorio"
            valor={getValor('mensaje_recordatorio')}
            token={token!}
            onGuardado={handleGuardado}
            tipo="textarea"
          />

          {/* WhatsApp */}
          <SeccionConfig
            titulo="Número de WhatsApp"
            descripcion="Número completo con código de país (ej: 5491112345678)"
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
