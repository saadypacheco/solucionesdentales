import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // API_URL es server-side (no NEXT_PUBLIC_) — el browser nunca lo ve
    // Vercel hace el proxy a la VPS sin mixed-content
    const backendUrl = process.env.API_URL || 'http://localhost:8001'
    console.log('[next.config] Backend URL for proxy:', backendUrl)
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
