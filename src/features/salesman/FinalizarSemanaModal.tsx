import { useState } from 'react'
import { Modal } from '../../components/Modal'

interface Props {
  abierto: boolean
  kmInicial: number
  onCerrar: () => void
  onConfirmar: (kmFinal: number) => Promise<void>
}

export function FinalizarSemanaModal({ abierto, kmInicial, onCerrar, onConfirmar }: Props) {
  const [km, setKm] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    setEnviando(true)
    try {
      await onConfirmar(valor)
      setKm('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Finalizar semana" abierto={abierto} onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-slate-500">
        Ingresa el kilometraje del vehículo al terminar la ruta. Kilometraje inicial: {kmInicial} km.
      </p>
      <label className="mb-1 block text-sm font-medium text-slate-700">Kilometraje final (km)</label>
      <input
        type="number"
        inputMode="decimal"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        placeholder="Ej. 45890"
        className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
      />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={manejarConfirmar}
        disabled={enviando}
        className="mt-2 w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {enviando ? 'Guardando...' : 'Finalizar semana'}
      </button>
    </Modal>
  )
}
