import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { formatMonto } from '../../lib/currency'
import type { CountryCode, VisitWithSales } from '../../lib/types'

interface Props {
  visita: VisitWithSales
  onAgregarVenta: (visitId: string) => void
  puedeAgregarVenta: boolean
  /** Determina si los montos se muestran en Quetzales o en Dólares. */
  country?: CountryCode | null
}

/** Fila compacta por defecto (foto miniatura + nombre + monto); el detalle completo de cada
 * venta (fotos, fecha, monto) solo aparece al presionar "Detalles", para no abrumar de una
 * vez a alguien que solo quiere ver rapido que se vendio. */
export function VisitaCard({ visita, onAgregarVenta, puedeAgregarVenta, country }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [fotoVisitaAmpliada, setFotoVisitaAmpliada] = useState(false)
  const totalVenta = visita.sales.reduce((suma, v) => suma + Number(v.amount), 0)
  const fechaHoraVisita = new Date(visita.captured_at).toLocaleString('es-GT', {
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
        <FotoPrivada
          bucket="visit-photos"
          path={visita.photo_path}
          alt="Foto tomada en la visita a la tienda"
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{visita.store_name || 'Tienda sin nombre'}</p>
          <p className="text-xs text-slate-400">{fechaHoraVisita}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900">{formatMonto(totalVenta, country)}</p>
          <p className="text-xs text-slate-400">
            {visita.sales.length} venta{visita.sales.length !== 1 && 's'}
          </p>
        </div>
        <IconChevron
          className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {expandido && (
        <div className="border-t border-slate-100 p-3">
          {visita.notes && (
            <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-400">Nota: </span>
              {visita.notes}
            </p>
          )}

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Foto de la visita
          </p>
          <button type="button" onClick={() => setFotoVisitaAmpliada(true)} className="mb-3 block w-full">
            <FotoPrivada
              bucket="visit-photos"
              path={visita.photo_path}
              alt="Foto tomada en la visita a la tienda"
              className="h-40 w-full rounded-lg object-cover"
            />
            <span className="mt-1 block text-center text-[10px] font-medium text-brand-700">Ver foto</span>
          </button>

          {visita.sales.length > 0 && (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Detalle de las ventas
              </p>
              <ul className="divide-y divide-slate-100">
                {visita.sales.map((venta) => (
                  <li key={venta.id} className="flex items-center gap-3 py-2.5 text-sm">
                    {venta.photo_path ? (
                      <button
                        type="button"
                        onClick={() => setFotoAmpliada(venta.photo_path)}
                        className="flex shrink-0 flex-col items-center gap-0.5"
                      >
                        <FotoPrivada
                          bucket="sale-photos"
                          path={venta.photo_path}
                          alt="Foto de lo que se vendió"
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <span className="text-[10px] font-medium text-brand-700">Ver foto</span>
                      </button>
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
                        Sin foto
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="text-[11px] text-slate-400">Fecha de la venta</p>
                      <p className="text-slate-700">
                        {new Date(venta.created_at).toLocaleString('es-GT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Monto vendido</p>
                      <p className="font-semibold text-slate-900">{formatMonto(Number(venta.amount), country)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {puedeAgregarVenta && (
        <button
          type="button"
          onClick={() => onAgregarVenta(visita.id)}
          className="w-full border-t border-slate-100 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          + Agregar venta
        </button>
      )}

      <Modal titulo="Foto de lo que se vendió" abierto={!!fotoAmpliada} onCerrar={() => setFotoAmpliada(null)}>
        {fotoAmpliada && (
          <>
            <FotoPrivada
              bucket="sale-photos"
              path={fotoAmpliada}
              alt="Foto de lo que se vendió"
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
            <p className="mt-2 text-xs text-slate-500">
              Foto tomada por el vendedor al momento de registrar esta venta.
            </p>
          </>
        )}
      </Modal>

      <Modal
        titulo="Foto de la visita"
        abierto={fotoVisitaAmpliada}
        onCerrar={() => setFotoVisitaAmpliada(false)}
      >
        <FotoPrivada
          bucket="visit-photos"
          path={visita.photo_path}
          alt="Foto tomada en la visita a la tienda"
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />
      </Modal>
    </div>
  )
}
