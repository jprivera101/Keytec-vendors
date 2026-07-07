import { useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { recortarImagen } from '../lib/cropImage'

interface EditorFotoProps {
  imageSrc: string
  onConfirmar: (blob: Blob) => void
  onCancelar: () => void
}

export function EditorFoto({ imageSrc, onConfirmar, onCancelar }: EditorFotoProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [areaRecorte, setAreaRecorte] = useState<Area | null>(null)
  const [procesando, setProcesando] = useState(false)

  async function confirmar() {
    if (!areaRecorte) return
    setProcesando(true)
    try {
      const blob = await recortarImagen(imageSrc, areaRecorte, rotation)
      onConfirmar(blob)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div>
      <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={(_, areaPixels) => setAreaRecorte(areaPixels)}
        />
      </div>

      <div className="mt-3 space-y-3">
        <label className="block text-xs font-medium text-slate-500">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => r - 90)}
            className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700"
          >
            ⟲ Rotar
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => r + 90)}
            className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700"
          >
            ⟳ Rotar
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={procesando}
            className="flex-1 rounded-lg bg-brand-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {procesando ? 'Procesando...' : 'Usar esta foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
