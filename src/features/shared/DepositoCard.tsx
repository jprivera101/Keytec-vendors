import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import type { Deposito } from '../../lib/types'

interface Props {
  deposito: Deposito
  vendedorNombre?: string
}

/** Fila de un depósito: solo evidencia fotográfica (sin monto). `vendedorNombre` es para
 * vistas que mezclan depósitos de varios vendedores (p.ej. la del operario). */
export function DepositoCard({ deposito, vendedorNombre }: Props) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const fecha = new Date(deposito.created_at).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="card flex items-center gap-3 p-3">
      <button type="button" onClick={() => setFotoAmpliada(true)} className="shrink-0">
        <FotoPrivada
          bucket="deposit-photos"
          path={deposito.photo_path}
          alt="Foto del depósito"
          className="h-12 w-12 rounded-lg object-cover"
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">💰 {deposito.label || 'Depósito'}</p>
        <p className="truncate text-xs text-slate-400">
          {vendedorNombre && <span className="font-medium text-slate-500">{vendedorNombre} · </span>}
          {fecha}
        </p>
      </div>

      <Modal titulo="Foto del depósito" abierto={fotoAmpliada} onCerrar={() => setFotoAmpliada(false)}>
        <FotoPrivada
          bucket="deposit-photos"
          path={deposito.photo_path}
          alt="Foto del depósito"
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />
      </Modal>
    </div>
  )
}
