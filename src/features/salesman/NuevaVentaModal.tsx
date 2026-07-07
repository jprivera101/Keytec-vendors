import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CapturaFoto } from '../../components/CapturaFoto'
import { EditorFoto } from '../../components/EditorFoto'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { crearVenta } from '../../lib/api'
import type { Sale } from '../../lib/types'

interface Props {
  abierto: boolean
  visitId: string
  userId: string
  onCerrar: () => void
  onCreada: (venta: Sale) => void
}

type Paso = 'foto' | 'editar' | 'monto'

export function NuevaVentaModal({ abierto, visitId, userId, onCerrar, onCreada }: Props) {
  const [paso, setPaso] = useState<Paso>('foto')
  const [imagenOriginal, setImagenOriginal] = useState<string | null>(null)
  const [fotoFinal, setFotoFinal] = useState<Blob | null>(null)
  const [previewFinal, setPreviewFinal] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) reiniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  function reiniciar() {
    setPaso('foto')
    setImagenOriginal(null)
    setFotoFinal(null)
    setPreviewFinal(null)
    setMonto('')
    setError(null)
  }

  function manejarArchivo(archivo: File) {
    setImagenOriginal(URL.createObjectURL(archivo))
    setPaso('editar')
  }

  function manejarCropConfirmado(blob: Blob) {
    setFotoFinal(blob)
    setPreviewFinal(URL.createObjectURL(blob))
    setPaso('monto')
  }

  function continuarSinFoto() {
    setFotoFinal(null)
    setPreviewFinal(null)
    setPaso('monto')
  }

  async function guardar(cerrarAlTerminar: boolean) {
    const valor = Number(monto)
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      let path: string | null = null
      if (fotoFinal) {
        const comprimida = await comprimirImagen(fotoFinal)
        path = await subirFoto('sale-photos', userId, comprimida)
      }
      const venta = await crearVenta({ visit_id: visitId, amount: valor, photo_path: path })
      onCreada(venta)
      if (cerrarAlTerminar) {
        onCerrar()
      } else {
        reiniciar()
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Registrar venta" abierto={abierto} onCerrar={onCerrar}>
      {paso === 'foto' && (
        <div className="space-y-3">
          <CapturaFoto etiqueta="Foto del monto de venta" onArchivo={manejarArchivo} />
          <button
            type="button"
            onClick={continuarSinFoto}
            className="w-full text-center text-sm font-medium text-slate-500 underline"
          >
            Continuar sin foto
          </button>
        </div>
      )}

      {paso === 'editar' && imagenOriginal && (
        <EditorFoto
          imageSrc={imagenOriginal}
          onConfirmar={manejarCropConfirmado}
          onCancelar={() => setPaso('foto')}
        />
      )}

      {paso === 'monto' && (
        <div className="space-y-4">
          {previewFinal && (
            <img src={previewFinal} alt="Foto de la venta" className="h-40 w-full rounded-xl object-cover" />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Monto de la venta (Q)</label>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej. 350.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => guardar(false)}
              disabled={enviando}
              className="flex-1 rounded-lg border border-brand-700 py-2.5 text-sm font-semibold text-brand-700 disabled:opacity-60"
            >
              Guardar y agregar otra
            </button>
            <button
              type="button"
              onClick={() => guardar(true)}
              disabled={enviando}
              className="flex-1 rounded-lg bg-brand-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar y cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
