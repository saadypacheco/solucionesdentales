'use client'

import Link from 'next/link'
import { useLangStore } from '@/store/langStore'
import { useT } from '@/lib/i18n'

/* ─── DATA ─────────────────────────────────────────────── */
const servicios = [
  {
    num: '01',
    titulo: 'Estética dental',
    desc: 'Diseño de sonrisa, carillas de porcelana y blanqueamiento. Resultados desde la primera sesión.',
    tag: 'Más solicitado',
    accent: 'from-teal-500/20 to-teal-600/5',
    dot: 'bg-teal-400',
  },
  {
    num: '02',
    titulo: 'Implantes',
    desc: 'Implantes de titanio de última generación. Resultado permanente, estética natural.',
    tag: 'Alta tecnología',
    accent: 'from-sky-500/20 to-sky-600/5',
    dot: 'bg-sky-400',
  },
  {
    num: '03',
    titulo: 'Ortodoncia',
    desc: 'Brackets metálicos y alineadores invisibles con seguimiento digital mensual.',
    tag: 'Alineadores incluidos',
    accent: 'from-violet-500/20 to-violet-600/5',
    dot: 'bg-violet-400',
  },
  {
    num: '04',
    titulo: 'Urgencias',
    desc: 'Dolor agudo, fracturas y emergencias. Atención el mismo día, sin turno previo.',
    tag: 'Mismo día',
    accent: 'from-rose-500/20 to-rose-600/5',
    dot: 'bg-rose-400',
  },
]

const pasos = [
  { n: '01', titulo: 'Contanos qué necesitás', desc: 'El asistente IA clasifica tu consulta y te orienta en segundos, a cualquier hora.' },
  { n: '02', titulo: 'Elegí tu horario', desc: 'Disponibilidad en tiempo real. Elegís el slot que más te conviene en el calendario.' },
  { n: '03', titulo: 'Confirmación al instante', desc: 'Recibís confirmación por WhatsApp. Sin registro, sin contraseñas, sin esperas.' },
]

const testimonios = [
  {
    nombre: 'María G.',
    tratamiento: 'Blanqueamiento',
    texto: 'Agendé a las 11 de la noche y al día siguiente ya tenía turno confirmado. La atención fue increíble.',
    inicial: 'M',
  },
  {
    nombre: 'Carlos R.',
    tratamiento: 'Implante',
    texto: 'Hacía años que postergaba el implante. El presupuesto fue claro desde el inicio y el resultado superó todo.',
    inicial: 'C',
  },
  {
    nombre: 'Lucía M.',
    tratamiento: 'Ortodoncia',
    texto: 'Llevo 8 meses con los alineadores y los cambios son increíbles. El seguimiento por WhatsApp es un plus enorme.',
    inicial: 'L',
  },
]

const faqs = [
  { q: '¿Necesito crear una cuenta para agendar?', a: 'No. Solo necesitamos tu nombre y teléfono. Sin contraseñas, sin formularios largos.' },
  { q: '¿Cuánto tarda en confirmarse el turno?', a: 'La confirmación es automática. Recibís un mensaje por WhatsApp en menos de 5 minutos.' },
  { q: '¿Tienen financiación?', a: 'Sí, hasta 12 cuotas sin interés con todas las tarjetas. Te damos el detalle en la consulta sin cargo.' },
  { q: '¿Atienden urgencias sin turno?', a: 'Sí. Para urgencias contactanos directamente por WhatsApp y te atendemos el mismo día.' },
]

/* ─── COMPONENT ─────────────────────────────────────────── */
export default function Home() {
  const t = useT()
  const { lang, setLang } = useLangStore()

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
              {['#servicios:Servicios', '#como-funciona:Cómo funciona', '#galeria:Casos', '#faq:FAQ'].map((item) => {
                const [href, label] = item.split(':')
                return (
                  <a key={href} href={href} className="hover:text-white transition-colors duration-200">{label}</a>
                )
              })}
            </div>
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            <Link
              href="/turnos"
              className="btn-shine bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-teal-500/20"
            >
              {t.landing.cta}
            </Link>
          </div>
        </nav>
      </header>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section className="gradient-hero noise relative overflow-hidden pt-36 pb-32 px-4">
        {/* Orbs */}
        <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-teal-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            {/* — Texto — */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 glass text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-7">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Asistente IA disponible 24hs
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-black text-white leading-[0.93] tracking-tight mb-6">
                {lang === 'es' ? 'Tu mejor' : 'Your best'}<br />
                <span className="gradient-text">{lang === 'es' ? 'sonrisa' : 'smile'}</span><br />
                {lang === 'es' ? 'te espera.' : 'awaits you.'}
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-sm">
                {lang === 'es'
                  ? 'Agendá tu turno en 2 minutos, sin registro y sin llamadas. Confirmación instantánea por WhatsApp.'
                  : 'Book your appointment in 2 minutes, no registration and no calls. Instant confirmation via WhatsApp.'}
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Link
                  href="/turnos"
                  className="btn-shine bg-teal-500 hover:bg-teal-400 text-white font-bold px-7 py-3.5 rounded-full transition-all glow-teal-sm text-sm"
                >
                  {lang === 'es' ? 'Agendar turno gratis' : 'Book free appointment'} →
                </Link>
                <a
                  href="https://wa.me/5491100000000"
                  target="_blank"
                  className="glass text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/10 transition-all text-sm flex items-center gap-2"
                >
                  <span>💬</span> {lang === 'es' ? 'Urgencias' : 'Emergencies'}
                </a>
              </div>

              <div className="flex flex-wrap gap-4">
                {(lang === 'es'
                  ? ['Sin registro', 'Confirmación en minutos', 'Hasta 12 cuotas sin interés']
                  : ['No registration', 'Instant confirmation', 'Up to 12 interest-free installments']
                ).map((item) => (
                  <span key={item} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-teal-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* — Cards flotantes — */}
            <div className="hidden md:flex justify-center items-center relative h-80">
              {/* Card central */}
              <div className="glass rounded-3xl p-7 w-64 text-white text-center animate-float glow-teal">
                <div className="text-5xl mb-4">😁</div>
                <p className="font-bold text-lg tracking-tight">Tu nueva sonrisa</p>
                <p className="text-slate-400 text-xs mt-1.5">Resultados reales de pacientes</p>
                <div className="flex justify-center gap-0.5 mt-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
              </div>

              {/* Turno confirmado */}
              <div className="absolute -top-6 right-0 glass-white rounded-2xl px-4 py-3 shadow-2xl animate-float-slow">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">✅</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Turno confirmado</p>
                    <p className="text-[10px] text-slate-400">Mañana · 10:00hs</p>
                  </div>
                </div>
              </div>

              {/* Paciente nuevo */}
              <div className="absolute -bottom-4 -left-4 glass-white rounded-2xl px-4 py-3 shadow-2xl" style={{ animation: 'float-slow 10s ease-in-out infinite' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">👤</div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">María agendó recién</p>
                    <p className="text-[10px] text-slate-400">Hace 2 minutos</p>
                  </div>
                </div>
              </div>

              {/* Stat */}
              <div className="absolute top-1/2 -right-10 glass rounded-2xl px-4 py-3 text-white text-center">
                <p className="text-2xl font-black number-display text-teal-400">500+</p>
                <p className="text-[10px] text-slate-400">pacientes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats integradas en hero bottom */}
        <div className="max-w-6xl mx-auto relative z-10 mt-20">
          <div className="divider-teal mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { valor: '+500', label: 'Pacientes atendidos' },
              { valor: '10 años', label: 'De experiencia' },
              { valor: '98%', label: 'Satisfacción' },
              { valor: '<24hs', label: 'Tiempo de espera' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-black text-white number-display tracking-tight">{s.valor}</p>
                <p className="text-slate-500 text-sm mt-1">{s.label}</p>
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
                {lang === 'es' ? 'Tratamientos' : 'Treatments'}
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                {lang === 'es' ? 'Todo lo que tu' : 'Everything your'}<br />{lang === 'es' ? 'sonrisa necesita' : 'smile needs'}
              </h2>
            </div>
            <Link href="/turnos" className="text-teal-400 text-sm font-semibold hover:text-teal-300 transition-colors whitespace-nowrap">
              {lang === 'es' ? 'Ver todos' : 'See all'} →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {servicios.map((s) => (
              <div
                key={s.num}
                className={`group card-teal-hover rounded-3xl p-6 cursor-pointer relative overflow-hidden bg-gradient-to-br ${s.accent}`}
                style={{ background: `linear-gradient(135deg, var(--bg-surface), var(--bg-card))` }}
              >
                {/* Número fondo */}
                <span className="absolute -bottom-2 -right-2 text-[5rem] font-black leading-none select-none text-white/[0.03] group-hover:text-white/[0.05] transition-colors">
                  {s.num}
                </span>

                <div className="relative z-10">
                  <div className={`w-2 h-2 rounded-full ${s.dot} mb-5`} />
                  <div className="inline-block text-[10px] font-bold text-slate-400 border border-white/10 px-2.5 py-1 rounded-full mb-4 group-hover:border-teal-500/30 group-hover:text-teal-400 transition-colors">
                    {s.tag}
                  </div>
                  <h3 className="font-bold text-white text-lg mb-3 group-hover:text-teal-300 transition-colors leading-tight">
                    {s.titulo}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>

                <div className="mt-5 flex items-center gap-1 text-teal-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Consultar →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ═══════════════════════════════════ */}
      <section id="como-funciona" className="py-28 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {lang === 'es' ? 'Proceso' : 'Process'}
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              {lang === 'es' ? 'Agendá en' : 'Book in'} <span className="text-teal-600">2 minutos</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-sm mx-auto text-sm leading-relaxed">
              {lang === 'es'
                ? 'Sin llamadas, sin esperas. Tu turno confirmado antes de que termines de leer esto.'
                : 'No calls, no waiting. Your appointment confirmed before you finish reading this.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Línea conectora */}
            <div className="hidden md:block absolute top-10 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" />

            {pasos.map((p, i) => (
              <div key={p.n} className="relative text-center px-4">
                <div className="relative inline-flex mb-8">
                  {i === 0 && (
                    <span className="absolute inset-0 rounded-full bg-teal-500/20 animate-pulse-ring" />
                  )}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-xl shadow-teal-500/20">
                    {p.n}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-3 leading-tight">{p.titulo}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              href="/turnos"
              className="btn-shine inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold px-9 py-4 rounded-full text-sm transition-colors shadow-xl"
            >
              Reservar mi turno →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ GALERÍA ══════════════════════════════════════════ */}
      <section id="galeria" className="py-28 px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16">
            <div>
              <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Galería</p>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                Resultados<br />que hablan
              </h2>
            </div>
            <Link href="/galeria" className="text-teal-400 font-semibold text-sm hover:text-teal-300 transition-colors">
              Ver todos los casos →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { tratamiento: 'Blanqueamiento', duracion: '1 sesión', desc: 'Aclaración de 8 tonos con láser LED', antesEmoji: '😐', despuesEmoji: '😁' },
              { tratamiento: 'Diseño de sonrisa', duracion: '2 semanas', desc: '6 carillas de porcelana ultrafinas', antesEmoji: '😶', despuesEmoji: '🤩' },
              { tratamiento: 'Ortodoncia', duracion: '18 meses', desc: 'Alineadores invisibles Invisalign', antesEmoji: '😬', despuesEmoji: '😄' },
            ].map((c) => (
              <div key={c.tratamiento} className="group card-teal-hover rounded-3xl overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                {/* Visual */}
                <div className="relative h-52 flex overflow-hidden">
                  <div className="w-1/2 flex flex-col items-center justify-center gap-2" style={{ background: 'var(--bg-card)' }}>
                    <span className="text-5xl opacity-50 grayscale">{c.antesEmoji}</span>
                    <span className="text-[9px] font-bold text-slate-600 tracking-[0.15em] uppercase">Antes</span>
                  </div>
                  {/* Divisor */}
                  <div className="absolute left-1/2 top-0 bottom-0 z-10">
                    <div className="w-px h-full bg-white/10" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-[9px] text-white">↔</div>
                  </div>
                  <div className="w-1/2 flex flex-col items-center justify-center gap-2 bg-teal-500/5">
                    <span className="text-5xl">{c.despuesEmoji}</span>
                    <span className="text-[9px] font-bold text-teal-400 tracking-[0.15em] uppercase">Después</span>
                  </div>
                  {/* Badge */}
                  <div className="absolute top-3 left-3 glass text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    {c.duracion}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white text-sm">{c.tratamiento}</h3>
                  <p className="text-slate-500 text-xs mt-1">{c.desc}</p>
                  <p className="mt-3 text-teal-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver caso completo →
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIOS ══════════════════════════════════════ */}
      <section className="py-28 px-4" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Testimonios</p>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Lo que dicen<br />nuestros pacientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonios.map((t) => (
              <div key={t.nombre} className="card-teal-hover rounded-3xl p-7" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-base">★</span>
                  ))}
                </div>
                <p className="text-slate-400 leading-relaxed text-sm mb-6">"{t.texto}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.inicial}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.nombre}</p>
                    <p className="text-teal-500 text-xs">{t.tratamiento}</p>
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
            Slots disponibles esta semana
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight mb-5">
            Tu turno<br />
            <span className="gradient-text-warm">en 2 minutos.</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">Sin registro, sin llamadas. Confirmación instantánea por WhatsApp.</p>
          <Link
            href="/turnos"
            className="btn-shine inline-block bg-white text-slate-900 font-black text-lg px-12 py-4.5 rounded-full hover:bg-teal-50 transition-colors shadow-2xl"
            style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}
          >
            Agendar mi turno gratis
          </Link>
          <p className="text-slate-600 text-xs mt-5">Primera consulta sin cargo · Presupuesto detallado</p>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════ */}
      <section id="faq" className="py-28 px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">FAQ</p>
            <h2 className="text-4xl font-black text-white">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl overflow-hidden border border-white/5 hover:border-teal-500/20 transition-colors"
                style={{ background: 'var(--bg-surface)' }}
              >
                <summary className="px-6 py-5 flex items-center justify-between cursor-pointer list-none font-semibold text-white text-sm hover:text-teal-300 transition-colors select-none gap-4">
                  <span>{f.q}</span>
                  <span className="text-teal-500 text-xl font-light flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-5 text-slate-500 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {f.a}
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
                Consultorio odontológico de excelencia en Buenos Aires. Tecnología de vanguardia para tu mejor sonrisa.
              </p>
              <a
                href="https://wa.me/5491100000000"
                target="_blank"
                className="inline-flex items-center gap-2 mt-6 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
              >
                <span>💬</span> Escribinos por WhatsApp
              </a>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-5">Horarios</p>
              <div className="space-y-3 text-sm text-slate-500">
                <div>
                  <p>Lunes – Viernes</p>
                  <p className="text-slate-300">9:00 – 19:00</p>
                </div>
                <div>
                  <p>Sábados</p>
                  <p className="text-slate-300">9:00 – 13:00</p>
                </div>
                <p className="text-teal-500 text-xs">⚡ Urgencias fuera de horario</p>
              </div>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-5">Contacto</p>
              <div className="space-y-2.5 text-sm text-slate-500">
                <p>📍 Buenos Aires, Argentina</p>
                <p>📞 (011) 1234-5678</p>
                <p>✉️ info@solucionesdentales.com</p>
              </div>
            </div>
          </div>

          <div className="divider-teal mb-8" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>© 2026 Soluciones Dentales. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacidad</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Términos</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
