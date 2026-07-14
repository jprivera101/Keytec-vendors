import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import type { TiendaConLugar } from '../../lib/types'

/** Fila con la foto de la tienda (tomada en su primera visita), para que el admin pueda
 * verificarla de un vistazo sin tener que abrir el pin en el mapa. */
export function TiendaRegionCard({ tienda }: { tienda: TiendaConLugar }) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false)

  return (
    <div className="card flex items-center gap-3 p-3">
      {tienda.photo_path ? (
        <button type="button" onClick={() => setFotoAmpliada(true)} className="shrink-0">
          <FotoPrivada
            bucket="visit-photos"
            path={tienda.photo_path}
            alt={tienda.name}
            className="h-14 w-14 rounded-lg object-cover"
          />
        </button>
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
          Sin foto
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">
          {tienda.placeName ? `${tienda.placeName} · ${tienda.name}` : tienda.name}
        </p>
        <p className="text-xs text-slate-400">
          {tienda.latitude.toFixed(5)}, {tienda.longitude.toFixed(5)}
        </p>
      </div>

      <Modal titulo={tienda.name} abierto={fotoAmpliada} onCerrar={() => setFotoAmpliada(false)}>
        {tienda.photo_path && (
          <FotoPrivada
            bucket="visit-photos"
            path={tienda.photo_path}
            alt={tienda.name}
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  )
}
