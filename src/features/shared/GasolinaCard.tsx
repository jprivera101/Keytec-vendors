import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { formatMonto } from '../../lib/currency'
import type { CountryCode, GasolinaRegistro } from '../../lib/types'

interface Props {
  registro: GasolinaRegistro
  country?: CountryCode | null
}

const ETIQUETAS_FOTO = {
  initial_tank_photo_path: 'Tanque antes de cargar',
  final_tank_photo_path: 'Tanque después de cargar',
  receipt_photo_path: 'Factura',
} as const

/** Fila compacta (⛽ + monto); expande para ver las 3 fotos (tanque antes/después + factura),
 * cada una ampliable con un toque para verificarla bien. */
export function GasolinaCard({ registro, country }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<keyof typeof ETIQUETAS_FOTO | null>(null)
  const fecha = new Date(registro.created_at).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-highlight-400/20 text-xl">
          ⛽
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">Carga de gasolina</p>
          <p className="text-xs text-slate-400">{fecha}</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-slate-900">{formatMonto(registro.amount, country)}</p>
        <IconChevron
          className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {expandido && (
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-3">
          <FotoConEtiqueta
            campo="initial_tank_photo_path"
            path={registro.initial_tank_photo_path}
            etiqueta="Antes"
            onVerMasGrande={() => setFotoAmpliada('initial_tank_photo_path')}
          />
          <FotoConEtiqueta
            campo="final_tank_photo_path"
            path={registro.final_tank_photo_path}
            etiqueta="Después"
            onVerMasGrande={() => setFotoAmpliada('final_tank_photo_path')}
          />
          <FotoConEtiqueta
            campo="receipt_photo_path"
            path={registro.receipt_photo_path}
            etiqueta="Factura"
            onVerMasGrande={() => setFotoAmpliada('receipt_photo_path')}
          />
        </div>
      )}

      <Modal
        titulo={fotoAmpliada ? ETIQUETAS_FOTO[fotoAmpliada] : ''}
        abierto={!!fotoAmpliada}
        onCerrar={() => setFotoAmpliada(null)}
      >
        {fotoAmpliada && (
          <FotoPrivada
            bucket="gasoline-photos"
            path={registro[fotoAmpliada]}
            alt={ETIQUETAS_FOTO[fotoAmpliada]}
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  )
}

function FotoConEtiqueta({
  path,
  etiqueta,
  onVerMasGrande,
}: {
  campo: keyof typeof ETIQUETAS_FOTO
  path: string
  etiqueta: string
  onVerMasGrande: () => void
}) {
  return (
    <button type="button" onClick={onVerMasGrande} className="text-center">
      <FotoPrivada
        bucket="gasoline-photos"
        path={path}
        alt={etiqueta}
        className="h-20 w-full rounded-lg object-cover"
      />
      <p className="mt-1 text-[10px] text-slate-400">{etiqueta}</p>
    </button>
  )
}
