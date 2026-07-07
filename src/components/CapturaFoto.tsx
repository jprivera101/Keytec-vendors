import { useRef, useState } from 'react'

interface CapturaFotoProps {
  etiqueta: string
  onArchivo: (archivo: File) => void
}

export function CapturaFoto({ etiqueta, onArchivo }: CapturaFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setPreviewUrl(URL.createObjectURL(archivo))
    onArchivo(archivo)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={manejarCambio}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        📷 {etiqueta}
      </button>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Vista previa"
          className="mt-3 h-40 w-full rounded-xl object-cover"
        />
      )}
    </div>
  )
}
