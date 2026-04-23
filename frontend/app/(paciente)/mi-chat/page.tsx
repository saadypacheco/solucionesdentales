'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePacienteStore } from '@/store/pacienteStore'
import {
  listarConvosPaciente,
  listarMensajesPaciente,
  enviarMensajePaciente,
  type ConvoPaciente,
  type MensajeChat,
} from '@/lib/api/chat'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const POLL_MS = 15_000

export default function MiChatPage() {
  const t = useTranslations('chat')
  const tNav = useTranslations('navbar')
  const router = useRouter()
  const { token } = usePacienteStore()

  const [convos, setConvos] = useState<ConvoPaciente[]>([])
  const [seleccionado, setSeleccionado] = useState<ConvoPaciente | null>(null)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) router.push('/mis-turnos')
  }, [token, router])

  const cargarConvos = useCallback(async () => {
    if (!token) return
    try { setConvos(await listarConvosPaciente(token)) } catch { /* */ }
    setLoading(false)
  }, [token])

  const cargarMensajes = useCallback(async () => {
    if (!token || !seleccionado) return
    try {
      const msgs = await listarMensajesPaciente(token, seleccionado.odontologo_id)
      setMensajes(msgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { /* */ }
  }, [token, seleccionado])

  useEffect(() => { cargarConvos() }, [cargarConvos])
  useEffect(() => { cargarMensajes() }, [cargarMensajes])
  useEffect(() => {
    if (!seleccionado) return
    const i = setInterval(cargarMensajes, POLL_MS)
    return () => clearInterval(i)
  }, [seleccionado, cargarMensajes])

  // Auto-seleccionar la primera convo en mobile
  useEffect(() => {
    if (convos.length === 1 && !seleccionado) setSeleccionado(convos[0])
  }, [convos, seleccionado])

  async function enviar() {
    if (!token || !seleccionado || !input.trim()) return
    setEnviando(true)
    try {
      await enviarMensajePaciente(token, seleccionado.odontologo_id, input.trim())
      setInput('')
      await cargarMensajes()
    } catch { /* */ }
    finally { setEnviando(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
      <header className="bg-slate-950 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/mis-turnos" className="text-teal-400 font-semibold text-sm hover:text-teal-300">
            ← {tNav('back')}
          </Link>
          <p className="text-white font-bold text-sm">{t('paciente.title')}</p>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-4 min-h-0">
        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('loading')}</p>
        ) : convos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-slate-500 mb-4">{t('paciente.noOdontologos')}</p>
            <Link href="/turnos" className="inline-block bg-teal-600 text-white px-5 py-2.5 rounded-full font-bold">
              {t('paciente.bookFirst')}
            </Link>
          </div>
        ) : !seleccionado ? (
          <div className="space-y-2">
            {convos.map((c) => (
              <button
                key={c.odontologo_id}
                onClick={() => setSeleccionado(c)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-slate-800">{c.odontologo_nombre}</p>
                  {c.no_leidos > 0 && (
                    <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                      {c.no_leidos}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{c.ultimo_mensaje}</p>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-t-2xl px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <button onClick={() => setSeleccionado(null)} className="text-teal-700 text-sm">←</button>
              <p className="font-bold text-slate-800">{seleccionado.odontologo_nombre}</p>
            </div>

            <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-3">
              {mensajes.length === 0 ? (
                <p className="text-slate-400 text-center text-sm py-10">{t('noMessages')}</p>
              ) : (
                mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.autor === 'paciente' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                      m.autor === 'paciente'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-white text-slate-700 rounded-bl-none shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.mensaje}</p>
                      <p className={`text-[10px] mt-1 ${m.autor === 'paciente' ? 'text-teal-100' : 'text-slate-400'}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); enviar() }}
              className="bg-white rounded-b-2xl px-4 py-3 flex gap-2 border-t border-slate-100"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('inputPlaceholder')}
                disabled={enviando}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-teal-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || enviando}
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2 rounded-full disabled:opacity-50"
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
