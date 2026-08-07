import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { obtenerVentasCanceladas } from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { IconVentaCancelada } from '../../components/icons'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode } from '../../lib/types'

/** Reporte de auditoría: toda venta cancelada, con quién la canceló y por qué. Sirve tanto
 * para revisar patrones (¿un vendedor cancela demasiado seguido?) como para responder "¿por
 * qué este monto no aparece en el total?" sin tener que ir visita por visita. */
export function VentasCanceladasAdmin() {
  const { pais, region } = useOutletContext<AdminOutletContext>()

  const ventasQuery = useQuery({
    queryKey: ['ventas-canceladas', pais, region],
    queryFn: () => obtenerVentasCanceladas(pais, region),
  })

  const ventas = ventasQuery.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconVentaCancelada />}
        color="brand"
        title="Ventas canceladas"
        subtitle="Historial de ventas anuladas: quién la canceló, cuándo y por qué."
      />

      {ventasQuery.isLoading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
          No hay ventas canceladas en este alcance.
        </div>
      ) : (
        <>
          {/* Móvil/tablet: lista de tarjetas. */}
          <div className="space-y-3 lg:hidden">
            {ventas.map((venta) => (
              <div key={`${venta.origen}-${venta.id}`} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {venta.origen === 'venta' ? venta.storeName || 'Tienda sin nombre' : `📦 ${venta.clientName}`}
                    </p>
                    <p className="text-xs text-slate-400">{venta.salesmanName}</p>
                  </div>
                  <p className="shrink-0 font-bold text-slate-900">{formatMonto(venta.amount, venta.country)}</p>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Cancelada por <span className="font-medium text-slate-600">{venta.cancelledByName}</span> ·{' '}
                  {new Date(venta.cancelledAt).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="mt-1 rounded-lg bg-red-50 p-2 text-xs text-red-700">{venta.cancelReason}</p>
              </div>
            ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Tienda / Cliente</th>
                  {pais === 'ALL' && <th className="px-4 py-3 font-medium">País</th>}
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Cancelada por</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ventas.map((venta) => (
                  <tr key={`${venta.origen}-${venta.id}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {venta.origen === 'venta' ? venta.storeName || 'Tienda sin nombre' : `📦 ${venta.clientName}`}
                    </td>
                    {pais === 'ALL' && (
                      <td className="px-4 py-3 text-slate-500">
                        {venta.country ? NOMBRE_PAIS[venta.country as CountryCode] : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-500">{venta.salesmanName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMonto(venta.amount, venta.country)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{venta.cancelledByName}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(venta.cancelledAt).toLocaleString('es-GT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{venta.cancelReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
