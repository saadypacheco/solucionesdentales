import Link from 'next/link'

/* ─── DATA ─────────────────────────────────────────────── */
const servicios = [
  {
    num: '01',
    icono: '✨',
    titulo: 'Estética dental',
    desc: 'Diseño de sonrisa, carillas de porcelana y blanqueamiento profesional. Resultados en una sola sesión.',
    tag: 'Más solicitado',
    tagColor: 'bg-teal-500/20 text-teal-300',
  },
  {
    num: '02',
    icono: '🦷',
    titulo: 'Implantes',
    desc: 'Implantes de titanio de última generación. Recuperá tu sonrisa completa con resultados permanentes.',
    tag: 'Alta tecnología',
    tagColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    num: '03',
    icono: '😬',
    titulo: 'Ortodoncia',
    desc: 'Brackets y alineadores invisibles adaptados a tu caso. Control mensual con seguimiento digital.',
    tag: 'Incluye alineadores',
    tagColor: 'bg-purple-500/20 text-purple-300',
  },
  {
    num: '04',
    icono: '🚨',
    titulo: 'Urgencias',
    desc: 'Dolor agudo, fracturas y emergencias. Atención el mismo día, sin turno previo.',
    tag: 'Mismo día',
    tagColor: 'bg-red-500/20 text-red-300',
  },
]

const pasos = [
  { n: '1', titulo: 'Contanos qué necesitás', desc: 'Nuestro asistente IA te escucha y clasifica tu consulta en segundos.' },
  { n: '2', titulo: 'Elegí tu horario', desc: 'Ves disponibilidad en tiempo real y reservás el slot que más te conviene.' },
  { n: '3', titulo: 'Confirmación al instante', desc: 'Recibís confirmación por WhatsApp. Sin registro, sin contraseñas.' },
]

const testimonios = [
  { nombre: 'María G.', tratamiento: 'Blanqueamiento', stars: 5, texto: 'La atención fue increíble. Agendé a las 11 de la noche y al día siguiente ya tenía turno confirmado.' },
  { nombre: 'Carlos R.', tratamiento: 'Implante', stars: 5, texto: 'Hacía años que postergaba el implante. El presupuesto fue claro desde el inicio y el resultado superó mis expectativas.' },
  { nombre: 'Lucía M.', tratamiento: 'Ortodoncia', stars: 5, texto: 'Llevo 8 meses con los alineadores y los cambios son increíbles. El seguimiento por WhatsApp es un plus enorme.' },
]

const faqs = [
  { q: '¿Necesito crear una cuenta para agendar?', a: 'No. Solo necesitamos tu nombre y teléfono. Sin contraseñas, sin formularios largos.' },
  { q: '¿Cuánto tarda en confirmarse el turno?', a: 'La confirmación es automática. Recibís un mensaje por WhatsApp en menos de 5 minutos.' },
  { q: '¿Tienen financiación?', a: 'Sí, hasta 12 cuotas sin interés con todas las tarjetas. Te damos el detalle en la consulta sin cargo.' },
  { q: '¿Atienden urgencias sin turno?', a: 'Sí. Para urgencias podés contactarnos directamente por WhatsApp y te atendemos el mismo día.' },
]

/* ─── COMPONENT ─────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md shadow-teal-500/30">
              <span className="text-base">🦷</span>
            </div>
            <span className="font-bold text-white tracking-tight">Soluciones<span className="text-teal-400">Dentales</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#galeria" className="hover:text-white transition-colors">Casos</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <Link
            href="/turnos"
            className="btn-shine bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-md shadow-teal-500/30"
          >
            Agendar turno
          </Link>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="gradient-hero clip-diagonal noise relative overflow-hidden pt-32 pb-48 px-4">
        {/* Orbs de fondo */}
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-teal-400/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 glass text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Asistente IA disponible 24/7
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6">
                Tu mejor<br />
                <span className="gradient-text">sonrisa</span><br />
                te espera.
              </h1>

              <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-md">
                Agendá tu turno en 2 minutos, sin registro y sin llamadas. Nuestro asistente IA te guía en todo el proceso.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/turnos"
                  className="btn-shine bg-teal-500 hover:bg-teal-400 text-white font-bold px-7 py-3.5 rounded-full transition-all shadow-lg shadow-teal-500/30 glow-teal-sm text-sm"
                >
                  Agendar turno gratis →
                </Link>
                <a
                  href="https://wa.me/5491100000000"
                  target="_blank"
                  className="glass text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/10 transition-all text-sm flex items-center gap-2"
                >
                  <span className="text-base">💬</span> Urgencias
                </a>
              </div>

              {/* Social proof pills */}
              <div className="flex flex-wrap gap-2 mt-8">
                {['Sin registro', 'Confirmación instantánea', 'Financiación disponible'].map((t) => (
                  <span key={t} className="text-xs text-slate-400 flex items-center gap-1">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-teal-500" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero cards flotantes */}
            <div className="hidden md:flex justify-center items-center relative h-80">
              {/* Tarjeta central */}
              <div className="glass rounded-3xl p-6 w-64 text-white text-center animate-float glow-teal">
                <div className="text-5xl mb-3">😁</div>
                <p className="font-bold text-lg">Tu nueva sonrisa</p>
                <p className="text-slate-300 text-xs mt-1">Resultados reales de pacientes</p>
                <div className="flex justify-center gap-0.5 mt-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
              </div>

              {/* Card top right — turno confirmado */}
              <div className="absolute -top-4 right-0 glass-white rounded-2xl px-4 py-3 shadow-xl animate-float-slow">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">✅</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Turno confirmado</p>
                    <p className="text-[10px] text-slate-400">Mañana · 10:00hs</p>
                  </div>
                </div>
              </div>

              {/* Card bottom left — paciente nuevo */}
              <div className="absolute -bottom-2 left-0 glass-white rounded-2xl px-4 py-3 shadow-xl" style={{ animation: 'float-slow 10s ease-in-out infinite' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                    👤
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">María agendó recién</p>
                    <p className="text-[10px] text-slate-400">Hace 2 minutos</p>
                  </div>
                </div>
              </div>

              {/* Card stat */}
              <div className="absolute top-1/2 -right-8 glass rounded-xl px-3 py-2 text-white text-center">
                <p className="text-2xl font-black number-display">500+</p>
                <p className="text-[10px] text-slate-300">pacientes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-slate-900 py-10 px-4 -mt-1">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { valor: '+500', label: 'Pacientes satisfechos', icono: '👥' },
            { valor: '10', label: 'Años de experiencia', icono: '🏆' },
            { valor: '98%', label: 'Tasa de satisfacción', icono: '⭐' },
            { valor: '<24hs', label: 'Tiempo de espera', icono: '⚡' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl mb-1">{s.icono}</div>
              <p className="text-3xl font-black text-white number-display">{s.valor}</p>
              <p className="text-slate-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" className="py-24 px-4 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Tratamientos</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-2 leading-tight">
              Todo lo que tu<br />sonrisa necesita
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {servicios.map((s) => (
              <div
                key={s.num}
                className="group card-hover gradient-card border border-slate-100 rounded-3xl p-6 cursor-pointer relative overflow-hidden"
              >
                {/* Número de fondo */}
                <span className="absolute top-4 right-4 text-6xl font-black text-slate-100 group-hover:text-teal-50 transition-colors leading-none select-none">
                  {s.num}
                </span>

                <div className="relative z-10">
                  <div className="text-3xl mb-4">{s.icono}</div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.tagColor} mb-3 inline-block`}>
                    {s.tag}
                  </span>
                  <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-teal-700 transition-colors">
                    {s.titulo}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>

                {/* Arrow on hover */}
                <div className="mt-4 flex items-center gap-1 text-teal-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Ver más</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" className="py-24 px-4 bg-slate-950 clip-diagonal-reverse">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-teal-400 text-sm font-bold uppercase tracking-widest">Proceso</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-2">
              Agendá en <span className="gradient-text">2 minutos</span>
            </h2>
            <p className="text-slate-400 mt-3 max-w-md mx-auto">Sin llamadas, sin esperas. Tu turno confirmado antes de que termines de leer esto.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Línea conectora */}
            <div className="hidden md:block absolute top-12 left-[22%] right-[22%] h-px bg-gradient-to-r from-teal-600/0 via-teal-500/50 to-teal-600/0" />

            {pasos.map((p, i) => (
              <div key={p.n} className="relative text-center">
                <div className="relative inline-flex mb-6">
                  {/* Ring pulse en el primero */}
                  {i === 0 && (
                    <span className="absolute inset-0 rounded-full bg-teal-500/30 animate-pulse-ring" />
                  )}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-teal-500/30">
                    {p.n}
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{p.titulo}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/turnos"
              className="btn-shine inline-block bg-teal-500 hover:bg-teal-400 text-white font-bold px-8 py-4 rounded-full text-sm transition-all shadow-lg shadow-teal-500/30"
            >
              Probar ahora →
            </Link>
          </div>
        </div>
      </section>

      {/* ── GALERÍA ANTES/DESPUÉS ── */}
      <section id="galeria" className="py-24 px-4 bg-[#0a1628]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-teal-400 text-sm font-bold uppercase tracking-widest">Galería</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-2 leading-tight">
                Resultados<br />que hablan
              </h2>
            </div>
            <Link href="/galeria" className="text-teal-400 font-semibold text-sm hover:underline self-start md:self-auto">
              Ver todos los casos →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { tratamiento: 'Blanqueamiento', duracion: '1 sesión', desc: 'Aclaración de 8 tonos', antesEmoji: '😐', despuesEmoji: '😁' },
              { tratamiento: 'Diseño de sonrisa', duracion: '2 semanas', desc: 'Carillas de porcelana', antesEmoji: '😶', despuesEmoji: '🤩' },
              { tratamiento: 'Ortodoncia', duracion: '18 meses', desc: 'Alineadores invisibles', antesEmoji: '😬', despuesEmoji: '😄' },
            ].map((c) => (
              <div key={c.tratamiento} className="group card-hover bg-[#0f2133] rounded-3xl overflow-hidden shadow-sm border border-white/8">
                {/* Visual antes/después */}
                <div className="relative h-52 bg-gradient-to-br from-slate-100 to-slate-50 flex overflow-hidden">
                  {/* Antes */}
                  <div className="w-1/2 flex flex-col items-center justify-center bg-[#071828] gap-2">
                    <span className="text-5xl opacity-70">{c.antesEmoji}</span>
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Antes</span>
                  </div>

                  {/* Divisor */}
                  <div className="absolute left-1/2 top-0 bottom-0 flex flex-col items-center z-10">
                    <div className="w-px h-full bg-white shadow-md" />
                    <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center text-[10px]">
                      ↔
                    </div>
                  </div>

                  {/* Después */}
                  <div className="w-1/2 flex flex-col items-center justify-center bg-teal-50 gap-2">
                    <span className="text-5xl">{c.despuesEmoji}</span>
                    <span className="text-[10px] font-bold text-teal-600 tracking-widest uppercase">Después</span>
                  </div>

                  {/* Badge duración */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold text-slate-700 px-2.5 py-1 rounded-full shadow-sm">
                    {c.duracion}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-white">{c.tratamiento}</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{c.desc}</p>
                  <button className="mt-3 text-teal-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver caso completo →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="py-24 px-4 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">Testimonios</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-2">
              Lo que dicen<br />nuestros pacientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonios.map((t) => (
              <div key={t.nombre} className="card-hover bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed text-sm mb-5">"{t.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.nombre[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{t.nombre}</p>
                    <p className="text-slate-400 text-xs">{t.tratamiento}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BOLD ── */}
      <section className="py-24 px-4 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 glass text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Slots disponibles esta semana
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            Tu turno<br />
            <span className="gradient-text-warm">en 2 minutos.</span>
          </h2>
          <p className="text-slate-300 text-lg mb-8">Sin registro, sin llamadas. Confirmación instantánea por WhatsApp.</p>
          <Link
            href="/turnos"
            className="btn-shine inline-block bg-white text-teal-800 font-black text-lg px-10 py-4 rounded-full hover:bg-teal-50 transition-colors shadow-2xl"
          >
            Agendar mi turno gratis
          </Link>
          <p className="text-slate-500 text-xs mt-4">Primera consulta sin cargo · Presupuesto detallado</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 bg-[#f8fafc]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-teal-600 text-sm font-bold uppercase tracking-widest">FAQ</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden"
              >
                <summary className="px-6 py-4 flex items-center justify-between cursor-pointer list-none font-semibold text-slate-800 hover:text-teal-700 transition-colors select-none">
                  <span>{f.q}</span>
                  <span className="text-teal-600 text-xl font-light ml-4 group-open:rotate-45 transition-transform duration-200 flex-shrink-0">+</span>
                </summary>
                <div className="px-6 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-3">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🦷</span>
                </div>
                <span className="font-bold text-white text-lg">SolucionesDentales</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Consultorio odontológico de excelencia en Buenos Aires. Tecnología de vanguardia para tu mejor sonrisa.
              </p>
              <a
                href="https://wa.me/5491100000000"
                target="_blank"
                className="inline-flex items-center gap-2 mt-5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
              >
                <span>💬</span> Escribinos por WhatsApp
              </a>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-4">Horarios</p>
              <div className="space-y-2 text-sm">
                <p>Lunes – Viernes<br /><span className="text-white">9:00 – 19:00</span></p>
                <p>Sábados<br /><span className="text-white">9:00 – 13:00</span></p>
                <p className="text-teal-400 text-xs mt-3">⚡ Urgencias disponibles fuera de horario</p>
              </div>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-4">Contacto</p>
              <div className="space-y-2 text-sm">
                <p>📍 Buenos Aires, Argentina</p>
                <p>📞 (011) 1234-5678</p>
                <p>✉️ info@solucionesdentales.com</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
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
