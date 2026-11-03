import { useEffect, useRef, useState } from 'react'

interface Props {
  etiqueta: string
  onCapturada: (archivo: Blob) => void
}

type Estado = 'inactiva' | 'activando' | 'en_vivo' | 'error'

/** Si en este tiempo el <video> no produjo ni un frame, se asume que la cámara se trabó (pasa
 * en algunos Android) y se ofrece reintentar en vez de dejar "Preparando cámara..." para siempre. */
const TIMEOUT_CAMARA_MS = 8000

/** De la más exigente a la más permisiva: algunos celulares rechazan la resolución pedida
 * (OverconstrainedError) o no exponen "environment"; antes eso terminaba en error directo. */
const RESTRICCIONES_VIDEO: MediaTrackConstraints[] = [
  { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
  { facingMode: 'environment' },
  {},
]

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
  // Si el modal se cierra mientras getUserMedia todavía está pidiendo la cámara, el stream
  // llegaba después del desmontaje y nadie lo detenía: la cámara quedaba tomada y el siguiente
  // intento (en cualquier modal) fallaba con "No se pudo abrir la cámara".
  const montadoRef = useRef(true)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
      detenerCamara()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Libera la memoria de la vista previa anterior (cada foto son ~1-2 MB que quedaban
  // retenidos toda la jornada en celulares con poca RAM).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (estado !== 'en_vivo' || camaraLista) return
    const id = setTimeout(() => {
      detenerCamara()
      setError('La cámara no respondió. Toca "Reintentar"; si sigue igual, cierra otras apps que usen la cámara.')
      setEstado('error')
    }, TIMEOUT_CAMARA_MS)
    return () => clearTimeout(id)
  }, [estado, camaraLista])

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

  async function pedirStream(): Promise<MediaStream> {
    let ultimoError: unknown
    for (const video of RESTRICCIONES_VIDEO) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video, audio: false })
      } catch (e) {
        ultimoError = e
        // Sin permiso o sin cámara no tiene sentido probar con restricciones más simples.
        const nombre = (e as DOMException).name
        if (nombre === 'NotAllowedError' || nombre === 'SecurityError') break
      }
    }
    throw ultimoError
  }

  async function activarCamara() {
    detenerCamara()
    setError(null)
    setEstado('activando')
    setCamaraLista(false)
    setSoportaEnfoque(false)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('getUserMedia no disponible', 'NotSupportedError')
      }
      const stream = await pedirStream()
      if (!montadoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
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
      if (!montadoRef.current) return
      const err = e as DOMException
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setError(
          'Debes permitir el acceso a la cámara para tomar la foto (toca el candado junto a la dirección > Permisos > Cámara)',
        )
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró una cámara en este dispositivo')
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra app. Ciérrala e intenta de nuevo')
      } else if (err.name === 'NotSupportedError') {
        setError('Este navegador no permite usar la cámara. Abre la app en Chrome o Safari')
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
    if (!ctx) {
      setError('No se pudo procesar la foto, intenta de nuevo')
      return
    }
    ctx.drawImage(video, 0, 0)
    detenerCamara()
    canvas.toBlob(
      (blob) => {
        // Libera el buffer del canvas de inmediato (pesa varios MB en celulares con poca RAM).
        canvas.width = 0
        canvas.height = 0
        if (!montadoRef.current) return
        if (!blob) {
          // Antes esto no hacía nada: el vendedor tocaba "Tomar foto" y la cámara se apagaba
          // sin foto ni mensaje. Pasa cuando el celular se queda sin memoria.
          setError('No se pudo guardar la foto (poca memoria en el celular). Cierra otras apps e intenta de nuevo')
          setEstado('error')
          return
        }
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
            autoPlay
            playsInline
            muted
            // loadeddata no siempre se dispara en algunos Android/iOS; cualquiera de estos
            // significa que ya hay frames reales para capturar.
            onLoadedData={() => setCamaraLista(true)}
            onCanPlay={() => setCamaraLista(true)}
            onPlaying={() => setCamaraLista(true)}
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
