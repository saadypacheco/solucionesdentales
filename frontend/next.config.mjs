/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // API_URL es server-side (no NEXT_PUBLIC_) — el browser nunca lo ve
    // Vercel hace el proxy a la VPS sin mixed-content
    const backendUrl = process.env.API_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
