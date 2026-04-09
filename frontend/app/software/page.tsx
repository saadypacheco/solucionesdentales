'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ─── DEMO TABS ─────────────────────────────────────────── */
type Tab = 'booking' | 'turnos' | 'dashboard'

/* ─── COMPONENT ─────────────────────────────────────────── */
export default function SoftwareLanding() {
  const [activeTab, setActiveTab] = useState<Tab>('booking')
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', mensaje: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

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
              <span className="ml-2 text-xs text-slate-500 font-normal">para clínicas</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {[['#features', 'Funcionalidades'], ['#demo', 'Demo'], ['#precios', 'Precios'], ['#contacto', 'Contacto']].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <a
            href="#contacto"
            className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors btn-shine glow-teal-sm"
          >
            Pedir demo
          </a>
        </nav>
      </header>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="relative gradient-hero noise pt-32 pb-20 px-4 overflow-hidden min-h-screen flex items-center">
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-400/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em]">Software de gestión odontológica</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-black text-white leading-[0.93] mb-6">
              Tu clínica,<br />
              <span className="gradient-text">automatizada</span>
            </h1>

            <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-lg">
              Sistema completo para consultorio dental. Tus pacientes agendan solos 24/7,
              vos controlás todo desde el panel. Sin papel, sin llamadas perdidas, sin caos.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <a
                href="#contacto"
                className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-7 py-3.5 rounded-full transition-all btn-shine glow-teal-sm flex items-center gap-2"
              >
                Pedir demo gratuita
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#demo"
                className="border border-white/20 hover:border-teal-400/50 text-slate-300 hover:text-white font-bold px-7 py-3.5 rounded-full transition-all"
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Trust bullets */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {['Sin contrato anual', 'Setup en 24 horas', 'Soporte incluido'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right — mock app cards */}
          <div className="relative h-[480px] hidden lg:block">
            {/* Card 1 — booking */}
            <div className="absolute top-0 right-8 w-72 glass rounded-2xl p-4 glow-teal animate-float">
              <div className="text-xs text-teal-400 font-bold uppercase tracking-wider mb-3">Agenda online</div>
              <div className="text-white text-sm font-semibold mb-3">¿Qué tratamiento necesitás?</div>
              <div className="grid grid-cols-2 gap-2">
                {['Limpieza', 'Blanqueamiento', 'Ortodoncia', 'Implante'].map((t) => (
                  <div key={t} className={`text-xs rounded-lg px-3 py-2 text-center font-medium transition-colors ${t === 'Limpieza' ? 'bg-teal-500 text-white' : 'bg-white/10 text-slate-300'}`}>
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-teal-500/20 rounded-lg px-3 py-2 text-xs text-teal-300 text-center">
                Turnos disponibles hoy →
              </div>
            </div>

            {/* Card 2 — notification */}
            <div className="absolute top-44 left-0 w-64 glass-white rounded-2xl p-4 animate-float-slow shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                  🦷
                </div>
                <div>
                  <div className="text-slate-800 text-xs font-bold">Nuevo turno solicitado</div>
                  <div className="text-slate-600 text-xs mt-0.5">María G. — Blanqueamiento</div>
                  <div className="text-slate-400 text-xs mt-1">Mañana · 10:00 hs</div>
                </div>
              </div>
            </div>

            {/* Card 3 — stats */}
            <div className="absolute bottom-0 right-4 w-68 glass rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-3 font-medium">Resumen del día</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-black text-white">12</div>
                  <div className="text-xs text-slate-400">Turnos</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-teal-400">8</div>
                  <div className="text-xs text-slate-400">Confirmados</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-yellow-400">3</div>
                  <div className="text-xs text-slate-400">Pendientes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-6xl mx-auto px-4">
            <div className="divider-teal mb-0" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
              {[
                { n: '3 min', label: 'para agendar un turno' },
                { n: '0', label: 'llamadas perdidas' },
                { n: '24/7', label: 'disponible para pacientes' },
                { n: '100%', label: 'desde el celular' },
              ].map(({ n, label }) => (
                <div key={label} className="py-5 px-6 text-center" style={{ background: 'var(--bg-base)' }}>
                  <div className="text-2xl font-black text-teal-400 number-display">{n}</div>
                  <div className="text-xs text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ EL PROBLEMA ════════════════════════════════════ */}
      <section className="py-24 px-4" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">¿Te suena familiar?</div>
            <h2 className="text-4xl font-black text-white">Los problemas de siempre</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '📞', titulo: 'El teléfono no para', desc: 'Pacientes que llaman a cualquier hora para confirmar, cancelar o pedir turno. Tiempo perdido, llamadas sin respuesta.' },
              { icon: '📋', titulo: 'Papel y Excel', desc: 'La agenda en papel o en una hoja de cálculo. Sin visibilidad, sin recordatorios automáticos, sin historial.' },
              { icon: '❓', titulo: 'Sin control real', desc: 'No sabés quién canceló, quién no vino, qué pacientes llevan meses sin aparecer o qué días están más llenos.' },
              { icon: '💬', titulo: 'WhatsApp como sistema', desc: 'Coordinando turnos por chat, enviando recordatorios a mano, respondiendo mensajes fuera de horario.' },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="glass rounded-2xl p-6 border border-white/5 hover:border-red-400/20 transition-colors">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-white font-bold mb-2">{titulo}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════ */}
      <section id="features" className="py-24 px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Qué incluye</div>
            <h2 className="text-4xl font-black text-white mb-4">Todo lo que necesita tu clínica</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Un sistema completo, no un montón de herramientas separadas. Todo conectado, todo en un lugar.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                icon: '📅',
                titulo: 'Agenda online 24/7',
                desc: 'Tus pacientes agendan solos desde el celular, a cualquier hora. Sin llamar, sin esperar. El turno queda confirmado al instante.',
                tag: 'Core',
                accent: 'from-teal-500/20 to-teal-600/5',
              },
              {
                num: '02',
                icon: '🖥️',
                titulo: 'Panel de administración',
                desc: 'Vista completa del día, la semana o el mes. Confirmá, reasigná o cancelá turnos con un clic. Historial de cada paciente disponible.',
                tag: 'Control total',
                accent: 'from-sky-500/20 to-sky-600/5',
              },
              {
                num: '03',
                icon: '🤖',
                titulo: 'Asistente con IA',
                desc: 'Responde consultas frecuentes automáticamente, clasifica urgencias y deriva al canal correcto. Disponible las 24 horas.',
                tag: 'IA incluida',
                accent: 'from-violet-500/20 to-violet-600/5',
              },
              {
                num: '04',
                icon: '👥',
                titulo: 'CRM de pacientes',
                desc: 'Historial completo de cada paciente: tratamientos, ausencias, notas clínicas y score de fidelidad automático.',
                tag: 'Seguimiento',
                accent: 'from-emerald-500/20 to-emerald-600/5',
              },
              {
                num: '05',
                icon: '🔔',
                titulo: 'Alarmas inteligentes',
                desc: 'Notificaciones automáticas cuando un paciente cancela, lleva meses inactivo o tiene un turno sin confirmar.',
                tag: 'Proactivo',
                accent: 'from-amber-500/20 to-amber-600/5',
              },
              {
                num: '06',
                icon: '👨‍⚕️',
                titulo: 'Multi-doctor',
                desc: 'Registrá cada odontólogo con sus especialidades y horarios. El sistema asigna automáticamente el doctor correcto.',
                tag: 'Escalable',
                accent: 'from-rose-500/20 to-rose-600/5',
              },
            ].map(({ num, icon, titulo, desc, tag, accent }) => (
              <div key={num} className={`relative card-teal-hover rounded-3xl p-6 border border-white/6 bg-gradient-to-br ${accent} overflow-hidden`}>
                <div className="absolute top-4 right-4 text-[4rem] font-black text-white/[0.03] leading-none select-none">{num}</div>
                <div className="text-2xl mb-4">{icon}</div>
                <div className="inline-block bg-teal-500/15 text-teal-400 text-xs font-bold px-2.5 py-1 rounded-full mb-3">{tag}</div>
                <h3 className="text-white font-bold text-lg mb-2">{titulo}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DEMO VISUAL ═════════════════════════════════════ */}
      <section id="demo" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">El sistema en acción</div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Así se ve por dentro</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Cada módulo diseñado para que sea rápido de usar, tanto para el paciente como para el staff de la clínica.</p>
          </div>

          {/* Tab selector */}
          <div className="flex justify-center gap-2 mb-8">
            {([
              ['booking', '📲 Booking para pacientes'],
              ['turnos', '🗓️ Panel de turnos'],
              ['dashboard', '📊 Dashboard admin'],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === key
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Demo content */}
          <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
            {/* Browser bar */}
            <div className="bg-slate-100 px-4 py-3 flex items-center gap-3 border-b border-slate-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-slate-400 text-center">
                {activeTab === 'booking' && 'tuclinica.com/turnos'}
                {activeTab === 'turnos' && 'tuclinica.com/admin/dashboard'}
                {activeTab === 'dashboard' && 'tuclinica.com/admin/dashboard'}
              </div>
            </div>

            {/* Booking demo */}
            {activeTab === 'booking' && (
              <div className="p-8" style={{ background: 'linear-gradient(135deg, #020d12 0%, #071e22 40%, #0c3530 70%, #0f6b62 100%)' }}>
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">Paso 1 de 4</div>
                    <h3 className="text-white text-xl font-black">¿Qué tratamiento necesitás?</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Limpieza', dur: '30 min', active: true },
                      { label: 'Blanqueamiento', dur: '45 min', active: false },
                      { label: 'Ortodoncia', dur: '30 min', active: false },
                      { label: 'Implante', dur: '90 min', active: false },
                      { label: 'Estética', dur: '60 min', active: false },
                      { label: 'Urgencia', dur: '45 min', active: false },
                    ].map(({ label, dur, active }) => (
                      <div key={label} className={`rounded-2xl p-4 border transition-all ${active ? 'border-teal-400 bg-teal-500/20' : 'border-white/10 bg-white/5'}`}>
                        <div className={`font-semibold text-sm ${active ? 'text-teal-300' : 'text-white'}`}>{label}</div>
                        <div className="text-slate-400 text-xs mt-1">{dur}</div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-6 w-full bg-teal-500 text-white font-bold py-3 rounded-xl">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {/* Turnos demo */}
            {activeTab === 'turnos' && (
              <div className="p-6" style={{ background: 'var(--bg-base)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Turnos — Hoy, martes 8 de abril</h3>
                  <span className="text-xs bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full">12 turnos</span>
                </div>
                <div className="space-y-2">
                  {[
                    { hora: '09:00', nombre: 'Ana Rodríguez', trat: 'Limpieza', estado: 'realizado', color: 'text-green-400 bg-green-400/10' },
                    { hora: '09:30', nombre: 'Marcos Díaz', trat: 'Blanqueamiento', estado: 'realizado', color: 'text-green-400 bg-green-400/10' },
                    { hora: '10:30', nombre: 'Laura Gómez', trat: 'Ortodoncia', estado: 'confirmado', color: 'text-teal-400 bg-teal-400/10' },
                    { hora: '11:00', nombre: 'Pablo Torres', trat: 'Consulta', estado: 'confirmado', color: 'text-teal-400 bg-teal-400/10' },
                    { hora: '14:00', nombre: 'Sofía Martín', trat: 'Implante', estado: 'solicitado', color: 'text-yellow-400 bg-yellow-400/10' },
                    { hora: '15:30', nombre: 'Javier López', trat: 'Estética', estado: 'solicitado', color: 'text-yellow-400 bg-yellow-400/10' },
                  ].map(({ hora, nombre, trat, estado, color }) => (
                    <div key={hora} className="flex items-center gap-4 glass rounded-xl px-4 py-3">
                      <div className="text-teal-400 font-mono font-bold text-sm w-12">{hora}</div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-semibold">{nombre}</div>
                        <div className="text-slate-400 text-xs">{trat}</div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>{estado}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard demo */}
            {activeTab === 'dashboard' && (
              <div className="p-6" style={{ background: 'var(--bg-base)' }}>
                <h3 className="text-white font-bold mb-5">Dashboard — Resumen general</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Turnos hoy', valor: '12', sub: '8 confirmados', color: 'text-teal-400' },
                    { label: 'Pacientes activos', valor: '148', sub: '+3 esta semana', color: 'text-sky-400' },
                    { label: 'Alarmas', valor: '4', sub: '2 de alta prioridad', color: 'text-rose-400' },
                    { label: 'Tasa de asistencia', valor: '87%', sub: 'Último mes', color: 'text-emerald-400' },
                  ].map(({ label, valor, sub, color }) => (
                    <div key={label} className="glass rounded-2xl p-4 text-center">
                      <div className={`text-3xl font-black ${color} number-display`}>{valor}</div>
                      <div className="text-white text-xs font-semibold mt-1">{label}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>
                {/* Alarmas */}
                <div className="glass rounded-2xl p-4">
                  <div className="text-slate-300 text-sm font-bold mb-3">Alarmas recientes</div>
                  <div className="space-y-2">
                    {[
                      { tipo: 'Alta', desc: 'Carlos M. lleva 3 meses sin turno', color: 'bg-rose-400' },
                      { tipo: 'Alta', desc: 'Turno sin confirmar — Juan P. mañana 9:00', color: 'bg-rose-400' },
                      { tipo: 'Media', desc: '5 pacientes inactivos este mes', color: 'bg-yellow-400' },
                      { tipo: 'Baja', desc: 'Nuevo turno solicitado — María G.', color: 'bg-teal-400' },
                    ].map(({ tipo, desc, color }) => (
                      <div key={desc} className="flex items-center gap-3 text-sm">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                        <span className="text-slate-400">{desc}</span>
                        <span className="ml-auto text-xs text-slate-600">{tipo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ CÓMO SE IMPLEMENTA ══════════════════════════════ */}
      <section className="py-24 px-4" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Simple de arrancar</div>
          <h2 className="text-4xl font-black text-white mb-14">Tres pasos para empezar</h2>

          <div className="relative">
            {/* Line */}
            <div className="absolute top-10 left-[20%] right-[20%] h-px hidden md:block" style={{ background: 'linear-gradient(90deg, transparent, rgba(20,184,166,.3), rgba(20,184,166,.3), transparent)' }} />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { n: '01', titulo: 'Te enviamos el acceso', desc: 'En menos de 24 horas tenés tu URL, panel de admin y credenciales listas para configurar.' },
                { n: '02', titulo: 'Configuramos juntos', desc: 'Cargamos tus doctores, especialidades, horarios de atención y servicios. Te acompañamos en cada paso.' },
                { n: '03', titulo: 'Empezás a recibir turnos', desc: 'Compartís el link con tus pacientes y el sistema empieza a trabajar. Desde el día uno.' },
              ].map(({ n, titulo, desc }) => (
                <div key={n} className="relative flex flex-col items-center">
                  <div className="w-20 h-20 glass rounded-full flex items-center justify-center border border-teal-500/30 mb-6 glow-card">
                    <span className="text-teal-400 text-xl font-black">{n}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{titulo}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRECIOS ═════════════════════════════════════════ */}
      <section id="precios" className="py-24 px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Planes</div>
            <h2 className="text-4xl font-black text-white mb-4">Simple y transparente</h2>
            <p className="text-slate-400">Sin letra chica. Sin costos ocultos. Cancelá cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Básico */}
            <div className="glass rounded-3xl p-8 border border-white/6">
              <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Básico</div>
              <div className="text-4xl font-black text-white mb-1">$49<span className="text-xl text-slate-400 font-normal">/mes</span></div>
              <div className="text-slate-400 text-sm mb-8">Para clínicas con 1 odontólogo</div>
              <ul className="space-y-3 mb-8">
                {[
                  'Agenda online 24/7',
                  'Panel de administración',
                  'Gestión de turnos y estados',
                  'Perfil de pacientes',
                  'Hasta 1 doctor',
                  'Soporte por email',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#contacto" className="block text-center border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-white font-bold py-3 rounded-xl transition-all">
                Empezar con Básico
              </a>
            </div>

            {/* Plan Completo */}
            <div className="rounded-3xl p-8 border border-teal-500/40 relative" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,.1) 0%, rgba(20,184,166,.03) 100%)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                Más elegido
              </div>
              <div className="text-teal-400 text-sm font-bold uppercase tracking-wider mb-2">Completo</div>
              <div className="text-4xl font-black text-white mb-1">$99<span className="text-xl text-slate-400 font-normal">/mes</span></div>
              <div className="text-slate-400 text-sm mb-8">Para clínicas con varios profesionales</div>
              <ul className="space-y-3 mb-8">
                {[
                  'Todo lo del plan Básico',
                  'Asistente IA para consultas',
                  'CRM con score de fidelidad',
                  'Alarmas inteligentes',
                  'Multi-doctor con especialidades',
                  'Galería de casos clínicos',
                  'Soporte prioritario',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#contacto" className="block text-center bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 rounded-xl transition-all btn-shine glow-teal-sm">
                Empezar con Completo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA + FORMULARIO ════════════════════════════════ */}
      <section id="contacto" className="relative gradient-hero noise py-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-teal-500/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center relative">
          <div className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Empezá hoy</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 text-balance">
            Sumá tu clínica a <span className="gradient-text-warm">Soluciones Dentales</span>
          </h2>
          <p className="text-slate-300 mb-10">
            Configuración en 24 horas. Sin contrato anual. Cancelá cuando quieras.
          </p>

          {submitted ? (
            <div className="glass rounded-3xl p-10 text-center glow-teal">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-white text-2xl font-black mb-2">¡Perfecto!</h3>
              <p className="text-slate-300">Te contactamos en menos de 24 horas para coordinar tu demo gratuita.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 text-left space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Nombre y apellido *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Dra. García"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctora@clinica.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Teléfono / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+54 11 1234 5678"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">¿Cuántos odontólogos trabajan en tu clínica? <span className="text-slate-500">(opcional)</span></label>
                <input
                  type="text"
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  placeholder="Ej: 2 doctores, ortodoncia y estética"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-xl transition-colors btn-shine glow-teal-sm flex items-center justify-center gap-2 mt-2"
              >
                Quiero mi demo gratuita
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <p className="text-center text-slate-500 text-xs">Sin spam. Solo te contactamos para coordinar la demo.</p>
            </form>
          )}
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <footer className="py-12 px-4" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="divider-teal mb-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-xs">🦷</span>
              </div>
              <span className="font-bold text-white text-sm">
                Soluciones<span className="text-teal-400">Dentales</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-300 transition-colors">Ver demo de la clínica</Link>
              <a href="#contacto" className="hover:text-slate-300 transition-colors">Contacto</a>
            </div>
            <div className="text-slate-600 text-xs">© 2026 Soluciones Dentales</div>
          </div>
        </div>
      </footer>

    </div>
  )
}
