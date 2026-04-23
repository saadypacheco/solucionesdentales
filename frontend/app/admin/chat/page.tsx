'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  listarConvosStaff,
  listarMensajesStaff,
  enviarMensajeStaff,
  type ConvoStaff,
  type MensajeChat,
} from '@/lib/api/chat'

const POLL_MS = 15_000

export default function AdminChatPage() {
  const t = useTranslations('chat')
  const router = useRouter()
  const { token } = useAuthStore()

  const [convos, setConvos] = useState<ConvoStaff[]>([])
  const [seleccionado, setSeleccionado] = useState<ConvoStaff | null>(null)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) router.push('/admin/login')
  }, [token, router])

  const cargarConvos = useCallback(async () => {
    if (!token) return
    try { setConvos(await listarConvosStaff(token)) } catch { /* silent */ }
    setLoading(false)
  }, [token])

  const cargarMensajes = useCallback(async () => {
    if (!token || !seleccionado) return
    try {
      const msgs = await listarMensajesStaff(token, seleccionado.paciente_id)
      setMensajes(msgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { /* silent */ }
  }, [token, seleccionado])

  useEffect(() => { cargarConvos() }, [cargarConvos])
  useEffect(() => { cargarMensajes() }, [cargarMensajes])

  // Polling de la conversación abierta
  useEffect(() => {
    if (!seleccionado) return
    const interval = setInterval(cargarMensajes, POLL_MS)
    return () => clearInterval(interval)
  }, [seleccionado, cargarMensajes])

  async function enviar() {
    if (!token || !seleccionado || !input.trim()) return
    setEnviando(true)
    try {
      await enviarMensajeStaff(token, seleccionado.paciente_id, input.trim())
      setInput('')
      await cargarMensajes()
      await cargarConvos()
    } catch { /* silent */ }
    finally { setEnviando(false) }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)]" style={{ background: 'var(--bg-base)' }}>
      {/* Lista de conversaciones */}
      <div className="w-72 flex-shrink-0 border-r border-white/5 overflow-y-auto">
        <div className="px-4 py-3 border-b border-white/5">
          <h1 className="text-lg font-black text-white">{t('title')}</h1>
          <p className="text-slate-500 text-xs">{t('subtitle')}</p>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center py-10 text-sm">{t('loading')}</p>
        ) : convos.length === 0 ? (
          <p className="text-slate-500 text-center py-10 text-sm">{t('noConvos')}</p>
        ) : (
          convos.map((c) => (
            <button
              key={c.paciente_id}
              onClick={() => setSeleccionado(c)}
              className={`w-full text-left px-4 py-3 border-b border-white/[.04] hover:bg-white/[.03] transition-colors ${
                seleccionado?.paciente_id === c.paciente_id ? 'bg-teal-500/10' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-bold text-white text-sm truncate">{c.paciente_nombre}</p>
                {c.no_leidos > 0 && (
                  <span className="bg-teal-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                    {c.no_leidos}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {c.ultimo_autor === 'paciente' ? '' : '✓ '}{c.ultimo_mensaje}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Conversación */}
      <div className="flex-1 flex flex-col min-w-0">
        {!seleccionado ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            {t('selectConvo')}
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-white/5 bg-[#080f1a]">
              <p className="font-bold text-white">{seleccionado.paciente_nombre}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {mensajes.length === 0 ? (
                <p className="text-slate-500 text-center text-sm py-10">{t('noMessages')}</p>
              ) : (
                mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.autor === 'odontologo' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md px-4 py-2 rounded-2xl text-sm ${
                      m.autor === 'odontologo'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.mensaje}</p>
                      <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); enviar() }}
              className="px-4 py-3 border-t border-white/5 bg-[#080f1a] flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('inputPlaceholder')}
                disabled={enviando}
                className="flex-1 bg-slate-900 border border-white/10 text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || enviando}
                className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2 rounded-full disabled:opacity-50"
              >
                {enviando ? t('sending') : t('send')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
