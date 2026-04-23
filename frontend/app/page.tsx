'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const SERVICIOS_KEYS = ['estetica', 'implantes', 'ortodoncia', 'urgencias'] as const
const PASOS_KEYS = ['s1', 's2', 's3'] as const
const TESTIMONIOS_KEYS = ['maria', 'carlos', 'lucia'] as const
const FAQS_KEYS = ['q1', 'q2', 'q3', 'q4'] as const
const GALLERY_KEYS = ['blanqueamiento', 'diseno', 'ortodoncia'] as const

const SERVICIOS_STYLE: Record<typeof SERVICIOS_KEYS[number], { num: string; accent: string; dot: string }> = {
  estetica: { num: '01', accent: 'from-teal-500/20 to-teal-600/5', dot: 'bg-teal-400' },
  implantes: { num: '02', accent: 'from-sky-500/20 to-sky-600/5', dot: 'bg-sky-400' },
  ortodoncia: { num: '03', accent: 'from-violet-500/20 to-violet-600/5', dot: 'bg-violet-400' },
  urgencias: { num: '04', accent: 'from-rose-500/20 to-rose-600/5', dot: 'bg-rose-400' },
}

const TESTIMONIOS_INICIAL: Record<typeof TESTIMONIOS_KEYS[number], string> = {
  maria: 'M',
  carlos: 'C',
  lucia: 'L',
}

const GALLERY_VISUAL: Record<typeof GALLERY_KEYS[number], { antesEmoji: string; despuesEmoji: string }> = {
  blanqueamiento: { antesEmoji: '😐', despuesEmoji: '😁' },
  diseno: { antesEmoji: '😶', despuesEmoji: '🤩' },
  ortodoncia: { antesEmoji: '😬', despuesEmoji: '😄' },
}

export default function Home() {
  const t = useTranslations('landing')
  const tNav = useTranslations('navbar')

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="text-sm">🦷</span>
            </div>
            <span className="font-bold text-white tracking-tight text-sm">
              Soluciones<span className="text-teal-400">Dentales</span>
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <a href="#servicios" className="hover:text-white transition-colors duration-200">{tNav('services')}</a>
              <a href="#como-funciona" className="hover:text-white transition-colors duration-200">{tNav('howItWorks')}</a>
              <a href="#galeria" className="hover:text-white transition-colors duration-200">{tNav('cases')}</a>
              <a href="#faq" className="hover:text-white transition-colors duration-200">{tNav('faq')}</a>
            </div>
            <LanguageSwitcher />
            <Link
              href="/turnos"
              className="btn-shine bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-teal-500/20"
            >
              {tNav('bookCta')}
            </Link>
          </div>
        </nav>
      </header>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section className="gradient-hero noise relative overflow-hidden pt-36 pb-32 px-4">
        {/* Foto de fondo — el archivo vive en frontend/public/hero-smile.jpg */}
        <div
          className="absolute inset-0 pointer-events-none bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero-smile.jpg')",
          }}
          aria-hidden="true"
        />
        {/* Overlay paleta integrada: protege el texto a la izquierda, deja ver las personas en el centro/derecha */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(7, 31, 30, 0.88) 0%, rgba(7, 31, 30, 0.45) 40%, rgba(7, 31, 30, 0.05) 100%)",
          }}
          aria-hidden="true"
        />
        {/* Fade vertical sutil para integrar con navbar arriba y stats abajo */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#020d12]/40 via-transparent to-[#020d12]/65" aria-hidden="true" />

        {/* Orbs */}
        <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-teal-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            {/* — Texto — */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 glass text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-7">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                {t('hero.badge')}
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-black text-white leading-[0.93] tracking-tight mb-6">
                {t('hero.titleLine1')}<br />
                <span className="gradient-text">{t('hero.titleLine2')}</span><br />
                {t('hero.titleLine3')}
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-sm">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Link
                  href="/turnos"
                  className="btn-shine bg-teal-500 hover:bg-teal-400 text-white font-bold px-7 py-3.5 rounded-full transition-all glow-teal-sm text-sm"
                >
                  {t('hero.ctaPrimary')} →
                </Link>
                <a
                  href="https://wa.me/5491100000000"
                  target="_blank"
                  className="border border-white/40 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/10 hover:border-white/70 transition-all text-sm flex items-center gap-2 backdrop-blur-sm"
                >
                  <span>💬</span> {t('hero.ctaEmergency')}
                </a>
              </div>

              <div className="flex flex-wrap gap-4">
                {[t('hero.feature1'), t('hero.feature2'), t('hero.feature3')].map((item) => (
                  <span key={item} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-teal-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* — Cards flotantes — distribuidas en bordes para no tapar caras */}
            <div className="hidden md:block relative h-80">
              {/* Turno confirmado — esquina superior derecha */}
              <div className="absolute top-0 right-0 glass-white rounded-2xl px-4 py-3 shadow-2xl animate-float-slow">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">✅</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t('cards.appointmentConfirmed')}</p>
                    <p className="text-[10px] text-slate-400">{t('cards.tomorrow10')}</p>
                  </div>
                </div>
              </div>

              {/* Stat 500+ — esquina superior izquierda (compacta) */}
              <div className="absolute top-2 left-0 glass rounded-2xl px-4 py-3 text-white text-center animate-float">
                <p className="text-2xl font-black number-display text-teal-400">500+</p>
                <p className="text-[10px] text-slate-400">{t('cards.patientsCount')}</p>
              </div>

              {/* Paciente nuevo — esquina inferior izquierda */}
              <div className="absolute bottom-0 left-2 glass-white rounded-2xl px-4 py-3 shadow-2xl" style={{ animation: 'float-slow 10s ease-in-out infinite' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">👤</div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t('cards.patientJustBooked', { nombre: 'María' })}</p>
                    <p className="text-[10px] text-slate-400">{t('cards.minutesAgo', { n: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Tu nueva sonrisa — esquina inferior derecha, más compacta */}
              <div className="absolute bottom-0 right-0 glass rounded-2xl p-4 w-52 text-white text-center animate-float glow-teal">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <span className="text-2xl">😁</span>
                  <p className="font-bold text-sm tracking-tight">{t('cards.newSmile')}</p>
                </div>
                <div className="flex justify-center gap-0.5">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
                </div>
                <p className="text-slate-400 text-[10px] mt-1">{t('cards.realResults')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats integradas en hero bottom */}
        <div className="max-w-6xl mx-auto relative z-10 mt-20">
          <div className="divider-teal mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {(['patients', 'experience', 'satisfaction', 'waitTime'] as const).map((key) => (
              <div key={key}>
                <p className="text-3xl font-black text-white number-display tracking-tight">{t(`stats.${key}.valor`)}</p>
                <p className="text-slate-500 text-sm mt-1">{t(`stats.${key}.label`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SERVICIOS ════════════════════════════════════════ */}
      <section id="servicios" className="py-28 px-4" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">
                {t('services.kicker')}
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                {t('services.title')}<br />{t('services.title2')}
              </h2>
            </div>
            <Link href="/turnos" className="text-teal-400 text-sm font-semibold hover:text-teal-300 transition-colors whitespace-nowrap">
              {t('services.seeAll')} →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICIOS_KEYS.map((key) => {
              const style = SERVICIOS_STYLE[key]
              return (
                <div
                  key={key}
                  className={`group card-teal-hover rounded-3xl p-6 cursor-pointer relative overflow-hidden bg-gradient-to-br ${style.accent}`}
                  style={{ background: `linear-gradient(135deg, var(--bg-surface), var(--bg-card))` }}
                >
                  <span className="absolute -bottom-2 -right-2 text-[5rem] font-black leading-none select-none text-white/[0.03] group-hover:text-white/[0.05] transition-colors">
                    {style.num}
                  </span>

                  <div className="relative z-10">
                    <div className={`w-2 h-2 rounded-full ${style.dot} mb-5`} />
                    <div className="inline-block text-[10px] font-bold text-slate-400 border border-white/10 px-2.5 py-1 rounded-full mb-4 group-hover:border-teal-500/30 group-hover:text-teal-400 transition-colors">
                      {t(`services.items.${key}.tag`)}
                    </div>
                    <h3 className="font-bold text-white text-lg mb-3 group-hover:text-teal-300 transition-colors leading-tight">
                      {t(`services.items.${key}.titulo`)}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{t(`services.items.${key}.desc`)}</p>
                  </div>

                  <div className="mt-5 flex items-center gap-1 text-teal-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('services.consult')} →
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ═══════════════════════════════════ */}
      <section id="como-funciona" className="py-28 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {t('howItWorks.kicker')}
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              {t('howItWorks.title')} <span className="text-teal-600">{t('howItWorks.titleHighlight')}</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-sm mx-auto text-sm leading-relaxed">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" />

            {PASOS_KEYS.map((key, i) => (
              <div key={key} className="relative text-center px-4">
                <div className="relative inline-flex mb-8">
                  {i === 0 && (
                    <span className="absolute inset-0 rounded-full bg-teal-500/20 animate-pulse-ring" />
                  )}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-xl shadow-teal-500/20">
                    0{i + 1}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-3 leading-tight">{t(`howItWorks.steps.${key}.titulo`)}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{t(`howItWorks.steps.${key}.desc`)}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              href="/turnos"
              className="btn-shine inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold px-9 py-4 rounded-full text-sm transition-colors shadow-xl"
            >
              {t('howItWorks.ctaBook')} →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ GALERÍA ══════════════════════════════════════════ */}
      <section id="galeria" className="py-28 px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16">
            <div>
              <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">{t('gallery.kicker')}</p>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                {t('gallery.titleLine1')}<br />{t('gallery.titleLine2')}
              </h2>
            </div>
            <Link href="/galeria" className="text-teal-400 font-semibold text-sm hover:text-teal-300 transition-colors">
              {t('gallery.seeAll')} →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {GALLERY_KEYS.map((key) => {
              const visual = GALLERY_VISUAL[key]
              return (
                <div key={key} className="group card-teal-hover rounded-3xl overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                  <div className="relative h-52 flex overflow-hidden">
                    <div className="w-1/2 flex flex-col items-center justify-center gap-2" style={{ background: 'var(--bg-card)' }}>
                      <span className="text-5xl opacity-50 grayscale">{visual.antesEmoji}</span>
                      <span className="text-[9px] font-bold text-slate-600 tracking-[0.15em] uppercase">{t('gallery.before')}</span>
                    </div>
                    <div className="absolute left-1/2 top-0 bottom-0 z-10">
                      <div className="w-px h-full bg-white/10" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-[9px] text-white">↔</div>
                    </div>
                    <div className="w-1/2 flex flex-col items-center justify-center gap-2 bg-teal-500/5">
                      <span className="text-5xl">{visual.despuesEmoji}</span>
                      <span className="text-[9px] font-bold text-teal-400 tracking-[0.15em] uppercase">{t('gallery.after')}</span>
                    </div>
                    <div className="absolute top-3 left-3 glass text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      {t(`gallery.items.${key}.duracion`)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white text-sm">{t(`gallery.items.${key}.tratamiento`)}</h3>
                    <p className="text-slate-500 text-xs mt-1">{t(`gallery.items.${key}.desc`)}</p>
                    <p className="mt-3 text-teal-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      {t('gallery.viewCase')} →
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIOS ══════════════════════════════════════ */}
      <section className="py-28 px-4" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">{t('testimonials.kicker')}</p>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
              {t('testimonials.titleLine1')}<br />{t('testimonials.titleLine2')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIOS_KEYS.map((key) => (
              <div key={key} className="card-teal-hover rounded-3xl p-7" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-base">★</span>
                  ))}
                </div>
                <p className="text-slate-400 leading-relaxed text-sm mb-6">&ldquo;{t(`testimonials.items.${key}.texto`)}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {TESTIMONIOS_INICIAL[key]}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t(`testimonials.items.${key}.nombre`)}</p>
                    <p className="text-teal-500 text-xs">{t(`testimonials.items.${key}.tratamiento`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════ */}
      <section className="py-28 px-4 gradient-hero noise relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-teal-400/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 glass text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {t('ctaSection.badge')}
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight mb-5">
            {t('ctaSection.titleLine1')}<br />
            <span className="gradient-text-warm">{t('ctaSection.titleLine2')}</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">{t('ctaSection.subtitle')}</p>
          <Link
            href="/turnos"
            className="btn-shine inline-block bg-white text-slate-900 font-black text-lg px-12 py-4.5 rounded-full hover:bg-teal-50 transition-colors shadow-2xl"
            style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}
          >
            {t('ctaSection.cta')}
          </Link>
          <p className="text-slate-600 text-xs mt-5">{t('ctaSection.small')}</p>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════ */}
      <section id="faq" className="py-28 px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">{t('faq.kicker')}</p>
            <h2 className="text-4xl font-black text-white">{t('faq.title')}</h2>
          </div>
          <div className="space-y-2">
            {FAQS_KEYS.map((key) => (
              <details
                key={key}
                className="group rounded-2xl overflow-hidden border border-white/5 hover:border-teal-500/20 transition-colors"
                style={{ background: 'var(--bg-surface)' }}
              >
                <summary className="px-6 py-5 flex items-center justify-between cursor-pointer list-none font-semibold text-white text-sm hover:text-teal-300 transition-colors select-none gap-4">
                  <span>{t(`faq.items.${key}.q`)}</span>
                  <span className="text-teal-500 text-xl font-light flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-5 text-slate-500 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {t(`faq.items.${key}.a`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════ */}
      <footer className="px-4 pt-16 pb-10" style={{ background: 'var(--bg-card)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🦷</span>
                </div>
                <span className="font-bold text-white">SolucionesDentales</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                {t('footer.tagline')}
              </p>
              <a
                href="https://wa.me/5491100000000"
                target="_blank"
                className="inline-flex items-center gap-2 mt-6 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
              >
                <span>💬</span> {t('footer.ctaWa')}
              </a>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-5">{t('footer.hoursTitle')}</p>
              <div className="space-y-3 text-sm text-slate-500">
                <div>
                  <p>{t('footer.weekdays')}</p>
                  <p className="text-slate-300">9:00 – 19:00</p>
                </div>
                <div>
                  <p>{t('footer.weekend')}</p>
                  <p className="text-slate-300">9:00 – 13:00</p>
                </div>
                <p className="text-teal-500 text-xs">{t('footer.emergency')}</p>
              </div>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-5">{t('footer.contactTitle')}</p>
              <div className="space-y-2.5 text-sm text-slate-500">
                <p>📍 Buenos Aires, Argentina</p>
                <p>📞 (011) 1234-5678</p>
                <p>✉️ info@solucionesdentales.com</p>
              </div>
            </div>
          </div>

          <div className="divider-teal mb-8" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>{t('footer.rights')}</p>
            <div className="flex gap-6">
              <Link href="/privacidad" className="hover:text-slate-400 transition-colors">{t('footer.privacy')}</Link>
              <a href="#" className="hover:text-slate-400 transition-colors">{t('footer.terms')}</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
