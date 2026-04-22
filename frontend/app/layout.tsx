import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ChatWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
