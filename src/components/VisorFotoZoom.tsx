import { useEffect, useRef, useState } from 'react'
import { obtenerUrlFirmada, type BucketFotos } from '../lib/storage'
import { Spinner } from './Spinner'

interface Props {
  bucket: BucketFotos
  path: string | null
  alt: string
  abierto: boolean
  onCerrar: () => void
}

const ESCALA_MIN = 1
const ESCALA_MAX = 4

function distancia(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function limitar(valor: number) {
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, valor))
}

/** Visor de foto a pantalla completa con zoom: rueda del mouse o pellizco para acercar,
 * arrastrar para mover, doble clic/doble toque para alternar. Pensado para que el operario
 * pueda verificar bien un monto o un detalle chico de la foto antes de procesar la venta. */
export function VisorFotoZoom({ bucket, path, alt, abierto, onCerrar }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [escala, setEscala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [arrastrando, setArrastrando] = useState(false)

  const punterosActivos = useRef(new Map<number, { x: number; y: number }>())
  const ultimoPunto = useRef({ x: 0, y: 0 })
  const distanciaPinchInicial = useRef<number | null>(null)
  const escalaPinchInicial = useRef(1)

  useEffect(() => {
    if (!abierto || !path) return
    setEscala(1)
    setPos({ x: 0, y: 0 })
    setUrl(null)
    let activo = true
    obtenerUrlFirmada(bucket, path).then((u) => {
      if (activo) setUrl(u)
    })
    return () => {
      activo = false
    }
  }, [abierto, bucket, path])

  if (!abierto) return null

  function alternarZoom() {
    if (escala > 1) {
      setEscala(1)
      setPos({ x: 0, y: 0 })
    } else {
      setEscala(2.5)
    }
  }

  function manejarWheel(e: React.WheelEvent) {
    e.preventDefault()
    setEscala((actual) => limitar(actual - e.deltaY * 0.0015 * actual))
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    punterosActivos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punterosActivos.current.size === 2) {
      const puntos = Array.from(punterosActivos.current.values())
      distanciaPinchInicial.current = distancia(puntos[0], puntos[1])
      escalaPinchInicial.current = escala
      setArrastrando(false)
    } else {
      ultimoPunto.current = { x: e.clientX, y: e.clientY }
      setArrastrando(true)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!punterosActivos.current.has(e.pointerId)) return
    punterosActivos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (punterosActivos.current.size === 2 && distanciaPinchInicial.current) {
      const puntos = Array.from(punterosActivos.current.values())
      const factor = distancia(puntos[0], puntos[1]) / distanciaPinchInicial.current
      setEscala(limitar(escalaPinchInicial.current * factor))
      return
    }

    if (escala > 1) {
      const dx = e.clientX - ultimoPunto.current.x
      const dy = e.clientY - ultimoPunto.current.y
      ultimoPunto.current = { x: e.clientX, y: e.clientY }
      setPos((p) => ({ x: p.x + dx, y: p.y + dy }))
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    punterosActivos.current.delete(e.pointerId)
    if (punterosActivos.current.size < 2) distanciaPinchInicial.current = null
    if (punterosActivos.current.size === 0) setArrastrando(false)
  }

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEscala((e) => limitar(e - 0.5))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white hover:bg-white/20"
          >
            −
          </button>
          <span className="w-12 text-center text-xs text-white/60">{Math.round(escala * 100)}%</span>
          <button
            type="button"
            onClick={() => setEscala((e) => limitar(e + 0.5))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white hover:bg-white/20"
          >
            +
          </button>
          {escala > 1 && (
            <button
              type="button"
              onClick={() => {
                setEscala(1)
                setPos({ x: 0, y: 0 })
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              Restablecer
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      <div
        className="relative flex-1 touch-none select-none overflow-hidden"
        onWheel={manejarWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={alternarZoom}
        style={{ cursor: escala > 1 ? (arrastrando ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        {!url ? (
          <div className="flex h-full items-center justify-center">
            <Spinner texto="Cargando foto..." />
          </div>
        ) : (
          <img
            src={url}
            alt={alt}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-h-[80vh] max-w-[90vw]"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${escala})`,
              transition: arrastrando ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        )}
      </div>

      <p className="p-3 text-center text-xs text-white/40">
        Rueda del mouse o pellizco para acercar · arrastra para mover · doble clic para alternar
      </p>
    </div>
  )
}
