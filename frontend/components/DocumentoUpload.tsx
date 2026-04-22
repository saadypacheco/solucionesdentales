'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  onUpload: (file: File, fechaVencimiento?: string) => Promise<void>
  vencimientoMeses?: number | null
  initialFile?: string | null
  acceptedExt?: string
  disabled?: boolean
}

export default function DocumentoUpload({
  onUpload,
  vencimientoMeses,
  initialFile,
  acceptedExt = '.pdf,.jpg,.jpeg,.png',
  disabled = false,
}: Props) {
  const t = useTranslations('admin.compliance.upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setArchivo(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setArchivo(f)
  }

  async function submit() {
    if (!archivo) return
    setSubiendo(true)
    setError('')
    try {
      await onUpload(archivo, fechaVencimiento || undefined)
      setArchivo(null)
      setFechaVencimiento('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errorUpload'))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          disabled
            ? 'border-white/5 cursor-not-allowed opacity-50'
            : dragOver
              ? 'border-teal-400 bg-teal-500/10'
              : archivo
                ? 'border-teal-500/50 bg-teal-500/5'
                : 'border-white/15 hover:border-teal-400/50'
        }`}
      >
        {archivo ? (
          <div className="text-sm text-teal-300">
            📎 {t('fileSelected', { name: archivo.name })}
          </div>
        ) : initialFile ? (
          <div className="text-xs text-slate-400 space-y-1">
            <p>{t('dragOrClick')}</p>
            <p className="text-teal-400">{t('selectFile')}</p>
          </div>
        ) : (
          <div className="text-xs text-slate-500 space-y-1">
            <p>{t('dragOrClick')}</p>
            <p className="text-slate-600">{t('supportedFormats')}</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedExt}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {vencimientoMeses && archivo && (
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            {t('vencimiento')}
          </label>
          <input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      {archivo && (
        <button
          type="button"
          onClick={submit}
          disabled={subiendo || disabled}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          {subiendo ? t('submitting') : t('submit')}
        </button>
      )}
    </div>
  )
}
