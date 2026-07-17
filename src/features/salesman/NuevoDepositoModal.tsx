import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { crearDeposito } from '../../lib/api'
import type { Deposito } from '../../lib/types'

interface Props {
  abierto: boolean
  userId: string
  onCerrar: () => void
  onCreado: (deposito: Deposito) => void
}

export function NuevoDepositoModal({ abierto, userId, onCerrar, onCreado }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) setError(null)
  }, [abierto])

  async function guardar(archivo: Blob) {
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(archivo)
      const path = await subirFoto('deposit-photos', userId, comprimida)
      const deposito = await crearDeposito(userId, path)
      onCreado(deposito)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="💰 Registrar depósito" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-4">
        {enviando ? (
          <p className="text-center text-sm text-slate-500">Guardando...</p>
        ) : (
          <CamaraCaptura etiqueta="Foto del depósito" onCapturada={guardar} />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
