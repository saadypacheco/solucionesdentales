'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { getPaises, crearConsultorio, type Pais, type OnboardingData } from '@/lib/api/consultorios'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const TOTAL_PASOS = 5
type Paso = 1 | 2 | 3 | 4 | 5

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { token, user } = useAuthStore()

  const [paso, setPaso] = useState<Paso>(1)
  const [paises, setPaises] = useState<Pais[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState<{ id: number; nombre: string } | null>(null)

  // Form
  const [form, setForm] = useState<OnboardingData>({
    nombre: '',
    pais_codigo: '',
    direccion: '',
    telefono: '',
    email: '',
    wa_numero: '',
    identificacion_fiscal: '',
    matricula_titular: '',
  })

  useEffect(() => {
    if (!token || (user && user.rol !== 'superadmin')) {
      router.replace('/admin/login')
    }
  }, [token, user, router])

  useEffect(() => { getPaises().then(setPaises) }, [])

  const paisSel = paises.find((p) => p.codigo === form.pais_codigo)

  function puedeAvanzar(): boolean {
    if (paso === 1) return form.nombre.trim().length > 0
    if (paso === 2) return form.pais_codigo !== ''
    if (paso === 3) return true // opcional
    if (paso === 4) return true // opcional
    return false
  }

  async function crear() {
    if (!token) return
    setEnviando(true)
    setError('')
    try {
      const data: OnboardingData = {
        nombre: form.nombre.trim(),
        pais_codigo: form.pais_codigo,
      }
      // Solo enviar campos no vacíos
      if (form.direccion?.trim()) data.direccion = form.direccion.trim()
      if (form.telefono?.trim()) data.telefono = form.telefono.trim()
      if (form.email?.trim()) data.email = form.email.trim()
      if (form.wa_numero?.trim()) data.wa_numero = form.wa_numero.trim()
      if (form.identificacion_fiscal?.trim()) data.identificacion_fiscal = form.identificacion_fiscal.trim()
      if (form.matricula_titular?.trim()) data.matricula_titular = form.matricula_titular.trim()

      const res = await crearConsultorio(token, data)
      setExito({ id: res.id, nombre: res.nombre })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorCreate'))
    } finally {
      setEnviando(false)
    }
  }

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">{t('success')}</h1>
          <p className="text-slate-400 mb-6">{t('successHint')}</p>
          <p className="text-white font-bold mb-6">{exito.nombre}</p>
          <Link
            href="/superadmin"
            className="inline-block bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 py-3 rounded-full transition-colors"
          >
            {tCommon('back')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg-base)' }}>
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-8">
        <Link href="/superadmin" className="text-slate-400 text-sm hover:text-teal-400 transition-colors">
          ← {tCommon('back')}
        </Link>
        <LanguageSwitcher />
      </header>

      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black text-white">{t('title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
          <p className="text-teal-400 text-xs font-bold mt-3">{t('stepLabel', { current: paso, total: TOTAL_PASOS })}</p>
        </div>

        {/* Barra de progreso */}
        <div className="flex items-center gap-2 mb-10">
          {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                paso > n ? 'bg-teal-500 text-white' :
                paso === n ? 'bg-teal-500 text-white ring-4 ring-teal-500/20' :
                'bg-slate-800 text-slate-500'
              }`}>
                {n}
              </div>
              {n < TOTAL_PASOS && (
                <div className={`flex-1 h-1 rounded-full ${paso > n ? 'bg-teal-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[--bg-card] border border-white/5 rounded-2xl p-6 space-y-4">
          {/* Paso 1 */}
          {paso === 1 && (
            <>
              <h2 className="text-xl font-bold text-white">{t('step1.title')}</h2>
              <p className="text-slate-400 text-sm">{t('step1.subtitle')}</p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step1.nombre')} *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder={t('step1.nombrePlaceholder')}
                  autoFocus
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step1.direccion')}
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder={t('step1.direccionPlaceholder')}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>
            </>
          )}

          {/* Paso 2 */}
          {paso === 2 && (
            <>
              <h2 className="text-xl font-bold text-white">{t('step2.title')}</h2>
              <p className="text-slate-400 text-sm">{t('step2.subtitle')}</p>

              {paises.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">{t('step2.loadingCountries')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {paises.map((p) => (
                    <button
                      key={p.codigo}
                      onClick={() => setForm({ ...form, pais_codigo: p.codigo })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        form.pais_codigo === p.codigo
                          ? 'border-teal-500 bg-teal-500/10'
                          : 'border-white/10 hover:border-teal-400/50'
                      }`}
                    >
                      <p className="font-bold text-white">{p.nombre}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.codigo} · {p.idioma_default} · {p.moneda}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Paso 3 */}
          {paso === 3 && (
            <>
              <h2 className="text-xl font-bold text-white">{t('step3.title')}</h2>
              <p className="text-slate-400 text-sm">{t('step3.subtitle')}</p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step3.identificacion')}
                </label>
                <input
                  type="text"
                  value={form.identificacion_fiscal}
                  onChange={(e) => setForm({ ...form, identificacion_fiscal: e.target.value })}
                  placeholder={t(`step3.identificacionHelp.${form.pais_codigo}` as 'step3.identificacionHelp.AR')}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step3.matricula')}
                </label>
                <input
                  type="text"
                  value={form.matricula_titular}
                  onChange={(e) => setForm({ ...form, matricula_titular: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>
            </>
          )}

          {/* Paso 4 */}
          {paso === 4 && (
            <>
              <h2 className="text-xl font-bold text-white">{t('step4.title')}</h2>
              <p className="text-slate-400 text-sm">{t('step4.subtitle')}</p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step4.telefono')}
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step4.email')}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t('step4.wa')}
                </label>
                <input
                  type="text"
                  value={form.wa_numero}
                  onChange={(e) => setForm({ ...form, wa_numero: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
                />
                <p className="text-xs text-slate-600 mt-1">{t('step4.waHelp')}</p>
              </div>
            </>
          )}

          {/* Paso 5 — resumen */}
          {paso === 5 && (
            <>
              <h2 className="text-xl font-bold text-white">{t('step5.title')}</h2>
              <p className="text-slate-400 text-sm">{t('step5.subtitle')}</p>

              <div className="bg-slate-900 rounded-xl p-4">
                <dl className="grid grid-cols-3 gap-y-2 text-sm">
                  <dt className="text-slate-500">{t('step5.labels.nombre')}</dt>
                  <dd className="col-span-2 text-white">{form.nombre || '—'}</dd>
                  <dt className="text-slate-500">{t('step5.labels.pais')}</dt>
                  <dd className="col-span-2 text-white">{paisSel?.nombre ?? form.pais_codigo}</dd>
                  {form.direccion && (<><dt className="text-slate-500">{t('step5.labels.direccion')}</dt><dd className="col-span-2 text-white">{form.direccion}</dd></>)}
                  {form.identificacion_fiscal && (<><dt className="text-slate-500">{t('step5.labels.fiscal')}</dt><dd className="col-span-2 text-white">{form.identificacion_fiscal}</dd></>)}
                  {form.matricula_titular && (<><dt className="text-slate-500">{t('step5.labels.matricula')}</dt><dd className="col-span-2 text-white">{form.matricula_titular}</dd></>)}
                  {form.telefono && (<><dt className="text-slate-500">{t('step5.labels.telefono')}</dt><dd className="col-span-2 text-white">{form.telefono}</dd></>)}
                  {form.email && (<><dt className="text-slate-500">{t('step5.labels.email')}</dt><dd className="col-span-2 text-white">{form.email}</dd></>)}
                  {form.wa_numero && (<><dt className="text-slate-500">{t('step5.labels.wa')}</dt><dd className="col-span-2 text-white">{form.wa_numero}</dd></>)}
                </dl>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navegación */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setPaso((p) => Math.max(1, p - 1) as Paso)}
            disabled={paso === 1 || enviando}
            className="px-5 py-2.5 text-slate-400 hover:text-white text-sm border border-white/10 rounded-xl disabled:opacity-30 transition-colors"
          >
            {t('back')}
          </button>
          {paso < TOTAL_PASOS ? (
            <button
              onClick={() => setPaso((p) => Math.min(TOTAL_PASOS, p + 1) as Paso)}
              disabled={!puedeAvanzar()}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl disabled:opacity-30 transition-colors"
            >
              {t('next')} →
            </button>
          ) : (
            <button
              onClick={crear}
              disabled={enviando || !form.nombre.trim() || !form.pais_codigo}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl disabled:opacity-50 transition-colors"
            >
              {enviando ? t('creating') : t('create')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
