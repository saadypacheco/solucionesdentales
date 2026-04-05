import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import ChatWidget from '@/components/agente/ChatWidget'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Soluciones Dentales | Consultorio Odontológico',
  description: 'Tu sonrisa, nuestra prioridad. Agendá tu turno online de forma rápida y sencilla.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
