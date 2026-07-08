import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'

interface Props {
  abierto: boolean
  kmInicial: number
  userId: string
  onCerrar: () => void
  onConfirmar: (kmFinal: number, fotoPath: string) => Promise<void>
}

export function FinalizarSemanaModal({ abierto, kmInicial, userId, onCerrar, onConfirmar }: Props) {
  const [km, setKm] = useState('')
  const [foto, setFoto] = useState<Blob | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) {
      setKm('')
      setFoto(null)
      setError(null)
    }
  }, [abierto])

  async function manejarConfirmar() {
    const valor = Number(km)
    if (!km || Number.isNaN(valor)) {
      setError('Ingresa un kilometraje válido')
      return
    }
    if (valor < kmInicial) {
      setError(`El kilometraje final no puede ser menor al inicial (${kmInicial} km)`)
      return
    }
    if (!foto) {
      setError('Toma una foto del kilometraje')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(foto)
      const path = await subirFoto('mileage-photos', userId, comprimida)
      await onConfirmar(valor, path)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Finalizar semana" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Toma una foto del odómetro e ingresa el kilometraje al terminar la ruta. Kilometraje
          inicial: {kmInicial} km.
        </p>

        <CamaraCaptura etiqueta="Foto del kilometraje final" onCapturada={setFoto} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kilometraje final (km)</label>
          <input
            type="number"
            inputMode="decimal"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="Ej. 45890"
            className="input-field text-base"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={manejarConfirmar}
          disabled={enviando}
          className="btn-primary w-full py-2.5"
        >
          {enviando ? 'Guardando...' : 'Finalizar semana'}
        </button>
      </div>
    </Modal>
  )
}
