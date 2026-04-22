'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { loginStaff } from '@/lib/api/admin'
import { useAuthStore } from '@/store/authStore'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LoginPage() {
  const t = useTranslations('admin.login')
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { access_token, user } = await loginStaff(email, password)
      setAuth(access_token, user)
      router.push('/admin/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
            <span className="text-3xl">🦷</span>
          </div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </div>

        <div className="glass rounded-3xl p-8">
          <h2 className="text-white font-bold text-lg mb-6">{t('cardTitle')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {t('submitting')}
                </>
              ) : t('submit')}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          {t('footer')}
        </p>
      </div>
    </div>
  )
}
