import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import { formatMonto } from '../../lib/currency'
import type { CountryCode, VentaEnvio } from '../../lib/types'

interface Props {
  venta: VentaEnvio
  country?: CountryCode | null
}

/** Fila de una venta por envío: sin tienda ni ubicación, solo a quién se le vendió + foto + monto. */
export function EnvioCard({ venta, country }: Props) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const fecha = new Date(venta.created_at).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="card flex items-center gap-3 p-3">
      {venta.photo_path ? (
        <button type="button" onClick={() => setFotoAmpliada(true)} className="shrink-0">
          <FotoPrivada
            bucket="sale-photos"
            path={venta.photo_path}
            alt="Foto de la venta"
            className="h-12 w-12 rounded-lg object-cover"
          />
        </button>
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
          Sin foto
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">📦 {venta.client_name}</p>
        <p className="text-xs text-slate-400">{fecha}</p>
      </div>
      <p className="shrink-0 text-sm font-bold text-slate-900">{formatMonto(venta.amount, country)}</p>

      <Modal titulo="Foto de la venta" abierto={fotoAmpliada} onCerrar={() => setFotoAmpliada(false)}>
        {venta.photo_path && (
          <FotoPrivada
            bucket="sale-photos"
            path={venta.photo_path}
            alt="Foto de la venta"
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  )
}
