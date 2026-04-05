'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { enviarMensaje } from '@/lib/api/agente'
import { useIdentidad } from '@/store/identidadStore'

type Mensaje = { id: string; texto: string; esBot: boolean }

const SALUDO: Mensaje = {
  id: 'saludo',
  texto: '¡Hola! Soy la asistente virtual del consultorio. ¿En qué puedo ayudarte hoy? 😊',
  esBot: true,
}

const RESPUESTAS_RAPIDAS = [
  'Quiero agendar un turno',
  'Precios y tratamientos',
  'Tengo dolor, es urgente',
]

export default function ChatWidget() {
  const { sessionId, pacienteId } = useIdentidad()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO])
  const [input, setInput] = useState('')
  const [escribiendo, setEscribiendo] = useState(false)
  const [mostrarBurbuja, setMostrarBurbuja] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Generar sessionId estable (el store ya lo persiste, pero por si no está hidratado)
  const sessionIdRef = useRef(sessionId || uuidv4())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, escribiendo])

  useEffect(() => {
    const t = setTimeout(() => setMostrarBurbuja(false), 5000)
    return () => clearTimeout(t)
  }, [])

  async function enviar(texto: string) {
    if (!texto.trim() || escribiendo) return

    const msgUsuario: Mensaje = { id: Date.now().toString(), texto, esBot: false }
    setMensajes((prev) => [...prev, msgUsuario])
    setInput('')
    setEscribiendo(true)

    try {
      const res = await enviarMensaje({
        session_id: sessionIdRef.current,
        mensaje: texto,
        paciente_id: pacienteId ?? null,
      })
      const msgBot: Mensaje = {
        id: (Date.now() + 1).toString(),
        texto: res.respuesta,
        esBot: true,
      }
      setMensajes((prev) => [...prev, msgBot])
    } catch {
      const msgError: Mensaje = {
        id: (Date.now() + 1).toString(),
        texto: 'En este momento no puedo responder. Contactanos por WhatsApp para una respuesta inmediata.',
        esBot: true,
      }
      setMensajes((prev) => [...prev, msgError])
    } finally {
      setEscribiendo(false)
    }
  }

  return (
    <>
      {/* Burbuja de aviso */}
      {mostrarBurbuja && !abierto && (
        <div className="fixed bottom-24 right-6 z-50 bg-white rounded-2xl shadow-lg px-4 py-2.5 text-sm text-slate-700 border border-slate-100 max-w-[200px] animate-bounce">
          ¿Necesitás turno? ¡Escribime!
          <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white border-r border-b border-slate-100 rotate-45" />
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => { setAbierto(!abierto); setMostrarBurbuja(false) }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-300/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label="Abrir chat"
      >
        {abierto ? (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-teal-600 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              🦷
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">Soluciones Dentales</p>
              <p className="text-teal-100 text-xs mt-0.5">Asistente virtual · IA</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-teal-100 text-xs">En línea</span>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {mensajes.map((m) => (
              <div key={m.id} className={`flex ${m.esBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                  m.esBot
                    ? 'bg-white text-slate-700 shadow-sm rounded-tl-none'
                    : 'bg-teal-600 text-white rounded-tr-none'
                }`}>
                  {m.texto}
                </div>
              </div>
            ))}

            {escribiendo && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Respuestas rápidas — solo al inicio */}
          {mensajes.length <= 2 && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 flex-wrap">
              {RESPUESTAS_RAPIDAS.map((r) => (
                <button
                  key={r}
                  onClick={() => enviar(r)}
                  className="text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200 hover:bg-teal-100 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); enviar(input) }}
            className="px-3 py-3 bg-white border-t border-slate-100 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu consulta..."
              disabled={escribiendo}
              className="flex-1 text-sm px-3 py-2 rounded-full border border-slate-200 focus:outline-none focus:border-teal-400 bg-slate-50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || escribiendo}
              className="w-9 h-9 flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
