import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import type { ParkingSpot } from '../../lib/types'

interface Props {
  parqueo: ParkingSpot
}

function formatearHora(fecha: string) {
  return new Date(fecha).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatearDuracion(inicio: string, fin: string) {
  const minutos = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000)
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas === 0 ? `${resto} min` : `${horas} h ${resto} min`
}

/** Fila compacta (🅿️ + hora + duración); expande para ver la foto del carro y del recibo. */
export function ParqueoCard({ parqueo }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<'car' | 'receipt' | null>(null)
  const abierto = !parqueo.ended_at

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-highlight-400/20 text-xl">
          🅿️
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{formatearHora(parqueo.started_at)}</p>
          <p className="text-xs text-slate-400">
            {abierto ? 'Aún abierto' : `Duración: ${formatearDuracion(parqueo.started_at, parqueo.ended_at!)}`}
          </p>
        </div>
        <IconChevron
          className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {expandido && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
          <button type="button" onClick={() => setFotoAmpliada('car')} className="text-center">
            <FotoPrivada
              bucket="parking-photos"
              path={parqueo.car_photo_path}
              alt="Foto del carro parqueado"
              className="h-24 w-full rounded-lg object-cover"
            />
            <p className="mt-1 text-[10px] text-slate-400">Carro</p>
          </button>
          {parqueo.receipt_photo_path ? (
            <button type="button" onClick={() => setFotoAmpliada('receipt')} className="text-center">
              <FotoPrivada
                bucket="parking-photos"
                path={parqueo.receipt_photo_path}
                alt="Foto del recibo del parqueo"
                className="h-24 w-full rounded-lg object-cover"
              />
              <p className="mt-1 text-[10px] text-slate-400">Recibo</p>
            </button>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
              Sin recibo (parqueo abierto)
            </div>
          )}
        </div>
      )}

      <Modal
        titulo={fotoAmpliada === 'car' ? 'Foto del carro' : 'Foto del recibo'}
        abierto={!!fotoAmpliada}
        onCerrar={() => setFotoAmpliada(null)}
      >
        {fotoAmpliada && (
          <FotoPrivada
            bucket="parking-photos"
            path={fotoAmpliada === 'car' ? parqueo.car_photo_path : parqueo.receipt_photo_path!}
            alt="Foto"
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  )
}
