import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { EditorFoto } from '../../components/EditorFoto'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { crearVenta } from '../../lib/api'
import { SIMBOLO_MONEDA } from '../../lib/currency'
import type { CountryCode, Sale } from '../../lib/types'

interface Props {
  abierto: boolean
  visitId: string
  userId: string
  country?: CountryCode | null
  onCerrar: () => void
  onCreada: (venta: Sale) => void
}

type Paso = 'foto' | 'editar' | 'monto'

export function NuevaVentaModal({ abierto, visitId, userId, country, onCerrar, onCreada }: Props) {
  const simbolo = country ? SIMBOLO_MONEDA[country] : 'Q'
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

  function manejarArchivo(archivo: Blob) {
    setImagenOriginal(URL.createObjectURL(archivo))
    setPaso('editar')
  }

  function manejarCropConfirmado(blob: Blob) {
    setFotoFinal(blob)
    setPreviewFinal(URL.createObjectURL(blob))
    setPaso('monto')
  }

  async function guardar(cerrarAlTerminar: boolean) {
    const valor = Number(monto)
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!fotoFinal) {
      setError('Toma una foto de la venta')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(fotoFinal)
      const path = await subirFoto('sale-photos', userId, comprimida)
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
      {paso === 'foto' && <CamaraCaptura etiqueta="Foto del monto de venta" onCapturada={manejarArchivo} />}

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
            <label className="mb-1 block text-sm font-medium text-slate-700">Monto de la venta ({simbolo})</label>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej. 350.00"
              className="input-field text-base"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => guardar(false)} disabled={enviando} className="btn-outline flex-1">
              Guardar y agregar otra
            </button>
            <button type="button" onClick={() => guardar(true)} disabled={enviando} className="btn-primary flex-1">
              Guardar y cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
