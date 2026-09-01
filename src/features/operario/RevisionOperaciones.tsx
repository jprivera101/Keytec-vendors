import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  obtenerVentasOperarioEnRango,
  obtenerVendedoresAsignados,
  obtenerRangoSeguroParaFotos,
  type VentaOperario,
} from '../../lib/operarios'
import { useAuth } from '../../lib/useAuth'
import { formatMonto } from '../../lib/currency'
import { fechaLocalISO, fechaDesdeISO } from '../../lib/fechas'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { FotoPrivada } from '../../components/FotoPrivada'
import { VisorFotoZoom } from '../../components/VisorFotoZoom'
import { PageHeader } from '../../components/PageHeader'
import { IconHistorial } from '../../components/icons'

const DIAS_RANGO_POR_DEFECTO = 29 // últimos 30 días (hoy - 29) al abrir la página.

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Historial de ventas (procesadas y pendientes, nunca canceladas) para que el operario pueda
 * repasar lo ya operado, no solo lo pendiente del día. El rango de fechas está acotado a
 * propósito a lo que obtenerRangoSeguroParaFotos permite: más allá de eso el job de retención
 * ya borró la foto de la venta, y no tendría sentido ofrecer una fecha cuya evidencia ya no
 * existe. */
export function RevisionOperaciones() {
  const { profile } = useAuth()
  const { minFecha, maxFecha } = obtenerRangoSeguroParaFotos()
  const maxFechaComoFecha = fechaDesdeISO(maxFecha)
  const desdePorDefecto0 = fechaLocalISO(
    new Date(maxFechaComoFecha.getFullYear(), maxFechaComoFecha.getMonth(), maxFechaComoFecha.getDate() - DIAS_RANGO_POR_DEFECTO),
  )
  const desdePorDefecto = desdePorDefecto0 > minFecha ? desdePorDefecto0 : minFecha

  const [vendedorFiltro, setVendedorFiltro] = useState<string | 'ALL'>('ALL')
  const [desde, setDesde] = useState(desdePorDefecto)
  const [hasta, setHasta] = useState(maxFecha)
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaOperario | null>(null)
  const [fotoZoomAbierta, setFotoZoomAbierta] = useState(false)

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores-asignados', profile!.id],
    queryFn: () => obtenerVendedoresAsignados(profile!.id),
  })
  const ventasQuery = useQuery({
    queryKey: ['ventas-operario-rango', desde, hasta],
    queryFn: () => obtenerVentasOperarioEnRango(desde, hasta),
  })

  const ventas = (ventasQuery.data ?? []).filter(
    (venta) => vendedorFiltro === 'ALL' || venta.salesmanId === vendedorFiltro,
  )

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconHistorial />}
        color="celeste"
        title="Revisión de operaciones"
        subtitle="Historial de ventas ya operadas, con su foto -- acotado a fechas donde la foto todavía existe."
      />

      <div className="card space-y-3 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Vendedor</label>
            <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} className="input-field">
              <option value="ALL">Todos mis vendedores</option>
              {vendedoresQuery.data?.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.id}>
                  {vendedor.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Desde</label>
            <input
              type="date"
              value={desde}
              min={minFecha}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="input-field text-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Hasta</label>
            <input
              type="date"
              value={hasta}
              min={desde}
              max={maxFecha}
              onChange={(e) => setHasta(e.target.value)}
              className="input-field text-base"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Solo se pueden elegir fechas desde el {minFecha.split('-').reverse().join('/')} en adelante: las fotos de
          ventas más viejas ya se eliminaron por la política de retención.
        </p>
      </div>

      {ventasQuery.isLoading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
          No hay ventas registradas en este rango.
        </div>
      ) : (
        <>
          {/* Móvil/tablet: lista de tarjetas. */}
          <div className="space-y-3 lg:hidden">
            {ventas.map((venta) => (
              <button
                key={venta.id}
                type="button"
                onClick={() => setVentaSeleccionada(venta)}
                className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
              >
                {venta.photoPath ? (
                  <FotoPrivada
                    bucket="sale-photos"
                    path={venta.photoPath}
                    alt="Foto de la venta"
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
                    Sin foto
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{venta.storeName || 'Tienda sin nombre'}</p>
                  <p className="truncate text-xs text-slate-400">
                    {venta.salesmanName} · {formatearFechaHora(venta.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-slate-900">{formatMonto(venta.amount, venta.country)}</p>
                  {venta.processed ? (
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                      ✓ Procesada
                    </span>
                  ) : (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Pendiente
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Foto</th>
                  <th className="px-4 py-3 font-medium">Tienda</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha de venta</th>
                  <th className="px-4 py-3 font-medium">Fecha de operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ventas.map((venta) => (
                  <tr
                    key={venta.id}
                    onClick={() => setVentaSeleccionada(venta)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5">
                      {venta.photoPath ? (
                        <FotoPrivada
                          bucket="sale-photos"
                          path={venta.photoPath}
                          alt="Foto de la venta"
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-center text-[9px] text-slate-400">
                          Sin foto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{venta.storeName || 'Tienda sin nombre'}</td>
                    <td className="px-4 py-3 text-slate-500">{venta.salesmanName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMonto(venta.amount, venta.country)}</td>
                    <td className="px-4 py-3">
                      {venta.processed ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          ✓ Procesada
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatearFechaHora(venta.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {venta.processedAt ? formatearFechaHora(venta.processedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal titulo="Detalle de la venta" abierto={!!ventaSeleccionada} onCerrar={() => setVentaSeleccionada(null)}>
        {ventaSeleccionada && (
          <div className="space-y-4">
            {ventaSeleccionada.photoPath ? (
              <button type="button" onClick={() => setFotoZoomAbierta(true)} className="block w-full">
                <FotoPrivada
                  bucket="sale-photos"
                  path={ventaSeleccionada.photoPath}
                  alt="Foto de la venta"
                  className="max-h-[50vh] w-full rounded-lg object-contain"
                />
                <span className="mt-1 block text-center text-xs font-medium text-brand-700">Toca para hacer zoom →</span>
              </button>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
                Sin foto
              </div>
            )}

            <div className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span className="text-slate-400">Tienda</span>
                <span className="font-semibold text-slate-900">{ventaSeleccionada.storeName || 'Tienda sin nombre'}</span>
              </p>
              {ventaSeleccionada.clientName && (
                <p className="flex justify-between">
                  <span className="text-slate-400">Cliente</span>
                  <span className="font-semibold text-slate-900">{ventaSeleccionada.clientName}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="text-slate-400">Vendedor</span>
                <span className="font-semibold text-slate-900">{ventaSeleccionada.salesmanName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Fecha de venta</span>
                <span className="font-semibold text-slate-900">{formatearFechaHora(ventaSeleccionada.createdAt)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Fecha de operación</span>
                <span className="font-semibold text-slate-900">
                  {ventaSeleccionada.processedAt ? formatearFechaHora(ventaSeleccionada.processedAt) : '—'}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="font-bold text-slate-900">{formatMonto(ventaSeleccionada.amount, ventaSeleccionada.country)}</span>
              </p>
            </div>

            {ventaSeleccionada.processed ? (
              <span className="block rounded-full bg-green-100 px-3 py-2 text-center text-sm font-semibold text-green-700">
                ✓ Procesada
              </span>
            ) : (
              <span className="block rounded-full bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-700">
                Pendiente de procesar
              </span>
            )}
          </div>
        )}
      </Modal>

      <VisorFotoZoom
        bucket="sale-photos"
        path={ventaSeleccionada?.photoPath ?? null}
        alt="Foto de la venta"
        abierto={fotoZoomAbierta}
        onCerrar={() => setFotoZoomAbierta(false)}
      />
    </div>
  )
}
