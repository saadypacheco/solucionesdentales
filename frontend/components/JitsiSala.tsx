'use client'

import { useEffect, useRef } from 'react'

interface Props {
  roomName: string
  password?: string
  displayName?: string
  email?: string
  onLeave?: () => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: object) => {
      addEventListener: (event: string, callback: (...args: unknown[]) => void) => void
      executeCommand: (command: string, ...args: unknown[]) => void
      dispose: () => void
    }
  }
}

const JITSI_DOMAIN = 'meet.jit.si'
const JITSI_SCRIPT_URL = 'https://meet.jit.si/external_api.js'

export default function JitsiSala({
  roomName,
  password,
  displayName = 'Paciente',
  email,
  onLeave,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Cargar el script de Jitsi si no está
      if (!window.JitsiMeetExternalAPI) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = JITSI_SCRIPT_URL
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Error cargando Jitsi'))
          document.head.appendChild(script)
        })
      }

      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return

      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName,
          email,
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: true,
          requireDisplayName: true,
          enableLobbyChat: true,
          enableClosePage: false,
        },
        interfaceConfigOverwrite: {
          DEFAULT_LOGO_URL: '',
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
        },
      })

      // Setear password al unirse
      if (password) {
        api.addEventListener('participantRoleChanged', (event: unknown) => {
          const e = event as { role?: string }
          if (e.role === 'moderator') {
            api.executeCommand('password', password)
          }
        })

        api.addEventListener('passwordRequired', () => {
          api.executeCommand('password', password)
        })
      }

      api.addEventListener('readyToClose', () => {
        if (onLeave) onLeave()
      })

      apiRef.current = api
    }

    init().catch(() => { /* noop */ })

    return () => {
      cancelled = true
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName])

  return <div ref={containerRef} className="w-full h-full bg-black" />
}
