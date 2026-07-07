import { useState } from 'react'
import { Modal } from '../../components/Modal'

interface Props {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: (kmInicial: number) => Promise<void>
}

export function IniciarSemanaModal({ abierto, onCerrar, onConfirmar }: Props) {
  const [km, setKm] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function manejarConfirmar() {
    const valor = Number(km)
    if (!km || Number.isNaN(valor) || valor < 0) {
      setError('Ingresa un kilometraje válido')
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
    <Modal titulo="Iniciar semana" abierto={abierto} onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-slate-500">
        Ingresa el kilometraje del vehículo antes de salir a ruta.
      </p>
      <label className="mb-1 block text-sm font-medium text-slate-700">Kilometraje inicial (km)</label>
      <input
        type="number"
        inputMode="decimal"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        placeholder="Ej. 45230"
        className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
      />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={manejarConfirmar}
        disabled={enviando}
        className="mt-2 w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {enviando ? 'Guardando...' : 'Iniciar semana'}
      </button>
    </Modal>
  )
}
