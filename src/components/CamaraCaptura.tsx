import { useEffect, useRef, useState } from 'react'

interface Props {
  etiqueta: string
  onCapturada: (archivo: Blob) => void
}

type Estado = 'inactiva' | 'activando' | 'en_vivo' | 'error'

/**
 * Captura una foto usando la camara en vivo (getUserMedia + canvas), sin pasar por el
 * selector de archivos del sistema. Asi el vendedor no puede subir una foto vieja de la
 * galeria: tiene que tomarla en el momento.
 */
export function CamaraCaptura({ etiqueta, onCapturada }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [estado, setEstado] = useState<Estado>('inactiva')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => detenerCamara()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El <video> solo se monta cuando estado === 'en_vivo', asi que recien ahi existe
  // videoRef.current. Intentar asignar el stream antes de ese cambio de estado (p.ej.
  // dentro de activarCamara) siempre encuentra el ref en null y la camara queda en negro.
  useEffect(() => {
    if (estado === 'en_vivo' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [estado])

  function detenerCamara() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function activarCamara() {
    setError(null)
    setEstado('activando')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setEstado('en_vivo')
    } catch (e) {
      const err = e as DOMException
      if (err.name === 'NotAllowedError') {
        setError('Debes permitir el acceso a la cámara para tomar la foto')
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró una cámara en este dispositivo')
      } else {
        setError('No se pudo abrir la cámara, intenta de nuevo')
      }
      setEstado('error')
    }
  }

  function tomarFoto() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    detenerCamara()
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setPreviewUrl(URL.createObjectURL(blob))
        onCapturada(blob)
      },
      'image/jpeg',
      0.9,
    )
  }

  function tomarDeNuevo() {
    setPreviewUrl(null)
    activarCamara()
  }

  if (previewUrl) {
    return (
      <div>
        <img src={previewUrl} alt="Foto tomada" className="h-48 w-full rounded-xl object-cover" />
        <button
          type="button"
          onClick={tomarDeNuevo}
          className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
        >
          Tomar de nuevo
        </button>
      </div>
    )
  }

  if (estado === 'en_vivo') {
    return (
      <div>
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-64 w-full rounded-xl bg-slate-900 object-cover"
        />
        <button
          type="button"
          onClick={tomarFoto}
          className="mt-2 w-full rounded-lg bg-brand-700 py-2.5 text-sm font-semibold text-white"
        >
          📸 Tomar foto
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={activarCamara}
        disabled={estado === 'activando'}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
      >
        <span>📷 {etiqueta}</span>
        <span className="text-xs font-normal text-slate-400">
          {estado === 'activando' ? 'Abriendo cámara...' : 'Toca para abrir la cámara'}
        </span>
      </button>
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
          <button type="button" onClick={activarCamara} className="ml-2 underline">
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
