import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { EditorFoto } from '../../components/EditorFoto'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { crearVentaEnvio } from '../../lib/api'
import { SIMBOLO_MONEDA } from '../../lib/currency'
import type { CountryCode, VentaEnvio } from '../../lib/types'

interface Props {
  abierto: boolean
  weekId: string
  userId: string
  country?: CountryCode | null
  onCerrar: () => void
  onCreada: (venta: VentaEnvio) => void
}

type Paso = 'foto' | 'editar' | 'datos'

/** Venta que no esta ligada a ninguna tienda ni ubicacion (p.ej. se vendio ya cerrada la
 * semana y se registra hasta iniciar la siguiente). Misma logica que una venta normal
 * (foto + monto) mas un campo de a quien se le vendio. */
export function NuevaVentaEnvioModal({ abierto, weekId, userId, country, onCerrar, onCreada }: Props) {
  const [paso, setPaso] = useState<Paso>('foto')
  const [imagenOriginal, setImagenOriginal] = useState<string | null>(null)
  const [fotoFinal, setFotoFinal] = useState<Blob | null>(null)
  const [previewFinal, setPreviewFinal] = useState<string | null>(null)
  const [cliente, setCliente] = useState('')
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const simbolo = country ? SIMBOLO_MONEDA[country] : 'Q'

  useEffect(() => {
    if (abierto) reiniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  function reiniciar() {
    setPaso('foto')
    setImagenOriginal(null)
    setFotoFinal(null)
    setPreviewFinal(null)
    setCliente('')
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
    setPaso('datos')
  }

  async function guardar() {
    const valor = Number(monto)
    if (!cliente.trim()) {
      setError('Escribe a quién le vendiste')
      return
    }
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
      const venta = await crearVentaEnvio({
        week_id: weekId,
        client_name: cliente.trim(),
        amount: valor,
        photo_path: path,
      })
      onCreada(venta)
      onCerrar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="📦 Venta por envío" abierto={abierto} onCerrar={onCerrar}>
      {paso === 'foto' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Para una venta que no quedó ligada a ninguna tienda (por ejemplo, se vendió
            después de cerrar la semana).
          </p>
          <CamaraCaptura etiqueta="Foto del monto de venta" onCapturada={manejarArchivo} />
        </div>
      )}

      {paso === 'editar' && imagenOriginal && (
        <EditorFoto
          imageSrc={imagenOriginal}
          onConfirmar={manejarCropConfirmado}
          onCancelar={() => setPaso('foto')}
        />
      )}

      {paso === 'datos' && (
        <div className="space-y-4">
          {previewFinal && (
            <img src={previewFinal} alt="Foto de la venta" className="h-40 w-full rounded-xl object-cover" />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">🧑 A quién le vendiste</label>
            <input
              type="text"
              autoFocus
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente"
              className="input-field text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              💵 Monto de la venta ({simbolo})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej. 350.00"
              className="input-field text-base"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="button" onClick={guardar} disabled={enviando} className="btn-primary w-full py-2.5">
            {enviando ? 'Guardando...' : '📦 Guardar venta por envío'}
          </button>
        </div>
      )}
    </Modal>
  )
}
