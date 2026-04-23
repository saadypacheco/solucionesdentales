'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { getStaff, type StaffUserDetailed } from '@/lib/api/admin'
import {
  getHorariosDoctor,
  reemplazarHorariosDoctor,
  type HorarioDoctor,
} from '@/lib/api/horarios'

const DEFAULTS: Record<number, { inicio: string; fin: string; activo: boolean }> = {
  0: { inicio: '09:00', fin: '19:00', activo: true },
  1: { inicio: '09:00', fin: '19:00', activo: true },
  2: { inicio: '09:00', fin: '19:00', activo: true },
  3: { inicio: '09:00', fin: '19:00', activo: true },
  4: { inicio: '09:00', fin: '19:00', activo: true },
  5: { inicio: '09:00', fin: '13:00', activo: true },
  6: { inicio: '09:00', fin: '13:00', activo: false },
}

function shortTime(t: string): string {
  return t.length >= 5 ? t.substring(0, 5) : t
}

interface FilaHorario {
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

function inicializarFilas(actuales: HorarioDoctor[]): FilaHorario[] {
  const map = new Map<number, FilaHorario>()
  for (let d = 0; d < 7; d++) {
    map.set(d, {
      dia_semana: d,
      hora_inicio: DEFAULTS[d].inicio,
      hora_fin: DEFAULTS[d].fin,
      activo: DEFAULTS[d].activo,
    })
  }
  for (const h of actuales) {
    map.set(h.dia_semana, {
      dia_semana: h.dia_semana,
      hora_inicio: shortTime(h.hora_inicio),
      hora_fin: shortTime(h.hora_fin),
      activo: h.activo,
    })
  }
  return Array.from(map.values())
}

export default function HorariosDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('admin.horarios')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { token, user } = useAuthStore()

  const [doctor, setDoctor] = useState<StaffUserDetailed | null>(null)
  const [filas, setFilas] = useState<FilaHorario[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [tieneCustom, setTieneCustom] = useState(false)

  useEffect(() => {
    if (!token) { router.push('/admin/login'); return }
    let cancelled = false
    Promise.all([getStaff(token), getHorariosDoctor(token, id)])
      .then(([staff, horarios]) => {
        if (cancelled) return
        const d = staff.find((s) => s.id === id) ?? null
        setDoctor(d)
        setFilas(inicializarFilas(horarios))
        setTieneCustom(horarios.length > 0)
      })
      .catch((e: Error) => setError(e.message ?? t('errorLoad')))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, id, router, t])

  function setField<K extends keyof FilaHorario>(dia: number, campo: K, valor: FilaHorario[K]) {
    setFilas((prev) => prev.map((f) => f.dia_semana === dia ? { ...f, [campo]: valor } : f))
  }

  async function guardar() {
    if (!token) return
    setGuardando(true)
    setError('')
    try {
      // Validar horarios activos
      for (const f of filas) {
        if (f.activo && f.hora_inicio >= f.hora_fin) {
          setError(t('errorInvalidRange', { dia: t(`days.${f.dia_semana}`) }))
          setGuardando(false)
          return
        }
      }
      // Solo mandamos los días que el admin quiere registrar (activos o no, todos)
      await reemplazarHorariosDoctor(token, id, filas.map((f) => ({
        dia_semana: f.dia_semana,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
        activo: f.activo,
      })))
      setOk(true)
      setTieneCustom(true)
      setTimeout(() => setOk(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorSave'))
    } finally {
      setGuardando(false)
    }
  }

  // Solo admin/superadmin pueden editar; odontólogo solo el propio
  const puedeEditar = !!user && (
    user.rol === 'admin' ||
    user.rol === 'superadmin' ||
    (user.rol === 'odontologo' && user.id === id)
  )

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/usuarios" className="text-teal-400 text-sm hover:text-teal-300">
          ← {tCommon('back')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">{t('title')}</h1>
        {doctor && (
          <p className="text-slate-400 text-sm mt-0.5">
            {doctor.nombre} · {doctor.email}
            {!tieneCustom && <span className="ml-3 text-slate-600">· {t('usingDefaults')}</span>}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-20">{tCommon('loading')}</div>
      ) : (
        <>
          <div className="bg-[--bg-card] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="text-left px-4 py-3">{t('table.day')}</th>
                  <th className="text-left px-4 py-3">{t('table.from')}</th>
                  <th className="text-left px-4 py-3">{t('table.to')}</th>
                  <th className="text-left px-4 py-3">{t('table.open')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filas.map((f) => (
                  <tr key={f.dia_semana} className={f.activo ? '' : 'opacity-50'}>
                    <td className="px-4 py-3 text-white font-medium capitalize">{t(`days.${f.dia_semana}`)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={f.hora_inicio}
                        onChange={(e) => setField(f.dia_semana, 'hora_inicio', e.target.value)}
                        disabled={!f.activo || !puedeEditar}
                        className="bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-1.5 disabled:opacity-50 focus:outline-none focus:border-teal-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={f.hora_fin}
                        onChange={(e) => setField(f.dia_semana, 'hora_fin', e.target.value)}
                        disabled={!f.activo || !puedeEditar}
                        className="bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-1.5 disabled:opacity-50 focus:outline-none focus:border-teal-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.activo}
                          onChange={(e) => setField(f.dia_semana, 'activo', e.target.checked)}
                          disabled={!puedeEditar}
                          className="accent-teal-500"
                        />
                        <span className="text-xs text-slate-400">
                          {f.activo ? t('table.openYes') : t('table.openNo')}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {puedeEditar && (
            <div className="flex items-center justify-end gap-3">
              {ok && <span className="text-green-400 text-xs font-bold">✓ {tCommon('saved')}</span>}
              <button
                onClick={guardar}
                disabled={guardando}
                className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"
              >
                {guardando ? tCommon('saving') : tCommon('save')}
              </button>
            </div>
          )}

          <p className="text-slate-600 text-xs">
            {t('hint')}
          </p>
        </>
      )}
    </div>
  )
}
