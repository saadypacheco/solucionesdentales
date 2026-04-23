'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import {
  getStaff, createStaff, updateStaff, resetStaffPassword, toggleStaff,
  type StaffUserDetailed,
} from '@/lib/api/admin'

const ROLES = ['admin', 'odontologo', 'recepcionista']
const ESPECIALIDADES_OPTIONS = [
  'blanqueamiento','ortodoncia','implante','limpieza','estetica','urgencia','consulta',
]

interface FormModal {
  type: 'crear' | 'editar'
  data?: StaffUserDetailed
}

export default function UsuariosPage() {
  const t = useTranslations('admin.usuarios')
  const tCommon = useTranslations('common')
  const tTratamientos = useTranslations('tratamientos')
  const { token } = useAuthStore()
  const [staff, setStaff] = useState<StaffUserDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<FormModal | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '', email: '', rol: 'recepcionista', password: '', especialidades: [] as string[],
  })

  useEffect(() => {
    if (token) loadStaff()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadStaff() {
    try {
      setLoading(true)
      const data = await getStaff(token!)
      setStaff(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorLoad'))
    } finally {
      setLoading(false)
    }
  }

  function openCrearModal() {
    setForm({ nombre: '', email: '', rol: 'recepcionista', password: '', especialidades: [] })
    setModal({ type: 'crear' })
    setError('')
  }

  function openEditarModal(usuario: StaffUserDetailed) {
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      password: '',
      especialidades: usuario.especialidades || [],
    })
    setModal({ type: 'editar', data: usuario })
    setError('')
  }

  async function handleSave() {
    if (!form.nombre || !form.email || !form.rol) {
      setError(t('errorRequired'))
      return
    }

    if (modal?.type === 'crear' && !form.password) {
      setError(t('errorPassword'))
      return
    }

    setSaving(true)
    setError('')
    try {
      if (modal?.type === 'crear') {
        await createStaff(token!, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          password: form.password,
          especialidades: form.especialidades,
        })
      } else if (modal?.type === 'editar' && modal.data) {
        await updateStaff(token!, modal.data.id, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          especialidades: form.especialidades,
        })
      }

      setModal(null)
      await loadStaff()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorSave'))
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword(usuario: StaffUserDetailed) {
    const newPass = prompt(t('promptResetPassword', { nombre: usuario.nombre }))
    if (!newPass) return

    try {
      await resetStaffPassword(token!, usuario.id, newPass)
      setError('')
      await loadStaff()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorReset'))
    }
  }

  async function handleToggle(usuario: StaffUserDetailed) {
    try {
      await toggleStaff(token!, usuario.id)
      await loadStaff()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorToggle'))
    }
  }

  if (loading) {
    return <div className="p-6 text-center">{t('loading')}</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-slate-800">{t('title')}</h1>
        <button
          onClick={openCrearModal}
          className="bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
        >
          {t('newUser')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">{t('table.name')}</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">{t('table.email')}</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">{t('table.role')}</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">{t('table.specialties')}</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">{t('table.state')}</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  {t('noUsers')}
                </td>
              </tr>
            ) : (
              staff.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{usuario.nombre}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{usuario.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        usuario.rol === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : usuario.rol === 'odontologo'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {usuario.especialidades && usuario.especialidades.length > 0
                      ? usuario.especialidades.map((e) => tTratamientos(e)).join(', ')
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        usuario.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {usuario.activo ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditarModal(usuario)}
                        className="text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleResetPassword(usuario)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors"
                      >
                        {t('reset')}
                      </button>
                      {(usuario.rol === 'odontologo' || usuario.rol === 'admin') && (
                        <Link
                          href={`/admin/usuarios/${usuario.id}/horarios`}
                          className="text-xs text-sky-600 hover:text-sky-700 font-semibold transition-colors"
                        >
                          {t('schedule')}
                        </Link>
                      )}
                      <button
                        onClick={() => handleToggle(usuario)}
                        className={`text-xs font-semibold transition-colors ${
                          usuario.activo
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {usuario.activo ? t('deactivate') : t('activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-black text-slate-800 mb-4">
              {modal.type === 'crear' ? t('modal.createTitle') : t('modal.editTitle')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t('modal.name')}
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t('modal.email')}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t('modal.role')}
                </label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {form.rol === 'odontologo' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('modal.specialties')}
                  </label>
                  <div className="space-y-2">
                    {ESPECIALIDADES_OPTIONS.map((esp) => (
                      <label key={esp} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.especialidades.includes(esp)}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              especialidades: e.target.checked
                                ? [...form.especialidades, esp]
                                : form.especialidades.filter((s) => s !== esp),
                            })
                          }}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">{tTratamientos(esp)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {modal.type === 'crear' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('modal.password')}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold disabled:opacity-40 hover:bg-teal-700 transition-colors"
              >
                {saving ? tCommon('saving') : tCommon('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
