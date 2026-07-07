import { FotoPrivada } from '../../components/FotoPrivada'
import type { VisitWithSales } from '../../lib/types'

interface Props {
  visita: VisitWithSales
  onAgregarVenta: (visitId: string) => void
  puedeAgregarVenta: boolean
}

export function VisitaCard({ visita, onAgregarVenta, puedeAgregarVenta }: Props) {
  const totalVenta = visita.sales.reduce((suma, v) => suma + Number(v.amount), 0)
  const hora = new Date(visita.captured_at).toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex gap-3 p-3">
        <FotoPrivada
          bucket="visit-photos"
          path={visita.photo_path}
          alt="Foto de la tienda"
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{visita.store_name || 'Tienda sin nombre'}</p>
          <p className="text-xs text-slate-500">{hora}</p>
          {visita.notes && <p className="mt-1 truncate text-xs text-slate-500">{visita.notes}</p>}
          <p className="mt-1 text-sm font-medium text-brand-700">
            {visita.sales.length} venta{visita.sales.length !== 1 && 's'} · Q{totalVenta.toFixed(2)}
          </p>
        </div>
      </div>

      {visita.sales.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 px-3">
          {visita.sales.map((venta) => (
            <li key={venta.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-600">
                {new Date(venta.created_at).toLocaleTimeString('es-GT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="font-semibold text-slate-900">Q{Number(venta.amount).toFixed(2)}</span>
            </li>
          ))}
        </ul>
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
    </div>
  )
}
