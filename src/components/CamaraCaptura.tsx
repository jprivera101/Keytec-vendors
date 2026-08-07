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
  const [camaraLista, setCamaraLista] = useState(false)
  const [soportaEnfoque, setSoportaEnfoque] = useState(false)
  const [enfocando, setEnfocando] = useState(false)

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
    setCamaraLista(false)
    setSoportaEnfoque(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      setEstado('en_vivo')

      // Enfoque continuo (mejor nitidez y evita que la camara quede fija en un enfoque
      // borroso). No todos los navegadores lo soportan, es un intento best-effort.
      const track = stream.getVideoTracks()[0]
      const capacidades = track?.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[] }) | undefined
      if (capacidades?.focusMode?.includes('continuous')) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
        } catch {
          // ignorar: el intento de enfoque continuo es opcional
        }
      }
      if (capacidades?.focusMode?.includes('single-shot')) {
        setSoportaEnfoque(true)
      }
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

  async function enfocar() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track || !soportaEnfoque) return
    setEnfocando(true)
    try {
      await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' } as MediaTrackConstraintSet] })
    } catch {
      // ignorar: el intento de reenfoque es opcional
    } finally {
      setTimeout(() => setEnfocando(false), 400)
    }
  }

  function tomarFoto() {
    const video = videoRef.current
    // Si el video todavia no tiene un frame real (dimensiones en 0 o sin datos), el canvas
    // queda transparente y toBlob('image/jpeg') lo rellena de negro: es la causa de las
    // fotos completamente negras. Hay que esperar a que la camara este realmente lista.
    if (!video || !camaraLista || video.videoWidth === 0 || video.videoHeight === 0) return
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
      0.92,
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
        <div className="relative">
          <video
            ref={videoRef}
            playsInline
            muted
            onLoadedData={() => setCamaraLista(true)}
            onClick={soportaEnfoque ? enfocar : undefined}
            className="h-64 w-full rounded-xl bg-slate-900 object-cover"
          />
          {!camaraLista && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/60 text-sm text-white">
              Preparando cámara...
            </div>
          )}
          {camaraLista && soportaEnfoque && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {enfocando ? 'Enfocando...' : 'Toca la imagen para enfocar'}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={tomarFoto}
          disabled={!camaraLista}
          className="mt-2 w-full rounded-lg bg-brand-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
