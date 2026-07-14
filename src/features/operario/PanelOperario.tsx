import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import {
  obtenerVentasOperario,
  obtenerVendedoresAsignados,
  marcarVentaProcesada,
  type VentaOperario,
} from '../../lib/operarios'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { FotoPrivada } from '../../components/FotoPrivada'
import { PageHeader } from '../../components/PageHeader'
import { IconProcesar } from '../../components/icons'

type FiltroEstado = 'pendiente' | 'procesada' | 'todas'
type FiltroSemana = 'activa' | 'anteriores' | 'todas'

export function PanelOperario() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [vendedorFiltro, setVendedorFiltro] = useState<string | 'ALL'>('ALL')
  const [semanaFiltro, setSemanaFiltro] = useState<FiltroSemana>('activa')
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('pendiente')
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaOperario | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores-asignados', profile!.id],
    queryFn: () => obtenerVendedoresAsignados(profile!.id),
  })
  const ventasQuery = useQuery({
    queryKey: ['ventas-operario'],
    queryFn: obtenerVentasOperario,
  })

  async function marcar(venta: VentaOperario, procesada: boolean) {
    setError(null)
    setProcesando(venta.id)
    try {
      await marcarVentaProcesada(venta.id, procesada, profile!.id)
      await queryClient.invalidateQueries({ queryKey: ['ventas-operario'] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProcesando(null)
    }
  }

  async function confirmarProcesada() {
    if (!ventaSeleccionada) return
    await marcar(ventaSeleccionada, true)
    setVentaSeleccionada(null)
  }

  const ventas = (ventasQuery.data ?? []).filter((venta) => {
    if (vendedorFiltro !== 'ALL' && venta.salesmanId !== vendedorFiltro) return false
    if (semanaFiltro === 'activa' && venta.weekStatus !== 'active') return false
    if (semanaFiltro === 'anteriores' && venta.weekStatus !== 'completed') return false
    if (estadoFiltro === 'pendiente' && venta.processed) return false
    if (estadoFiltro === 'procesada' && !venta.processed) return false
    return true
  })

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconProcesar />}
        color="celeste"
        title="Ventas por procesar"
        subtitle="Revisa la foto de cada venta y márcala como procesada en el CRM."
      />

      <div className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Vendedor</label>
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="input-field"
            >
              <option value="ALL">Todos mis vendedores</option>
              {vendedoresQuery.data?.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.id}>
                  {vendedor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0 lg:border-t-0 lg:pt-0">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Periodo</label>
            <Segmentado
              valor={semanaFiltro}
              opciones={[
                { valor: 'activa', etiqueta: 'Activa' },
                { valor: 'anteriores', etiqueta: 'Anteriores' },
                { valor: 'todas', etiqueta: 'Todas' },
              ]}
              onChange={setSemanaFiltro}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 sm:col-span-2 sm:border-t sm:pt-4 lg:col-span-1 lg:border-t-0 lg:pt-0">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Estado</label>
            <Segmentado
              valor={estadoFiltro}
              opciones={[
                { valor: 'pendiente', etiqueta: 'Pendientes' },
                { valor: 'procesada', etiqueta: 'Procesadas' },
                { valor: 'todas', etiqueta: 'Todas' },
              ]}
              onChange={(v) => setEstadoFiltro(v as FiltroEstado)}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {ventasQuery.isLoading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
          No hay ventas que coincidan con este filtro.
        </div>
      ) : (
        <>
          {/* Móvil/tablet: lista de tarjetas, más fácil de tocar. */}
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
                  <p className="truncate font-semibold text-slate-900">
                    {venta.storeName || 'Tienda sin nombre'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {venta.salesmanName} ·{' '}
                    {new Date(venta.createdAt).toLocaleString('es-GT', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <p className="shrink-0 text-right font-bold text-slate-900">
                  {formatMonto(venta.amount, venta.country)}
                </p>
                {venta.processed && (
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                    ✓ Procesada
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Escritorio: tabla, para revisar muchas ventas de un vistazo. */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Foto</th>
                  <th className="px-4 py-3 font-medium">Tienda</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
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
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {venta.storeName || 'Tienda sin nombre'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{venta.salesmanName}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(venta.createdAt).toLocaleString('es-GT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMonto(venta.amount, venta.country)}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        titulo="Detalle de la venta"
        abierto={!!ventaSeleccionada}
        onCerrar={() => setVentaSeleccionada(null)}
      >
        {ventaSeleccionada && (
          <div className="space-y-4">
            {ventaSeleccionada.photoPath ? (
              <FotoPrivada
                bucket="sale-photos"
                path={ventaSeleccionada.photoPath}
                alt="Foto de la venta"
                className="max-h-[50vh] w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
                Sin foto
              </div>
            )}

            <div className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span className="text-slate-400">Tienda</span>
                <span className="font-semibold text-slate-900">
                  {ventaSeleccionada.storeName || 'Tienda sin nombre'}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Vendedor</span>
                <span className="font-semibold text-slate-900">{ventaSeleccionada.salesmanName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Fecha</span>
                <span className="font-semibold text-slate-900">
                  {new Date(ventaSeleccionada.createdAt).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="font-bold text-slate-900">
                  {formatMonto(ventaSeleccionada.amount, ventaSeleccionada.country)}
                </span>
              </p>
            </div>

            {ventaSeleccionada.processed ? (
              <span className="block rounded-full bg-green-100 px-3 py-2 text-center text-sm font-semibold text-green-700">
                ✓ Ya está procesada
              </span>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">¿Marcar esta venta como procesada en el CRM?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVentaSeleccionada(null)}
                    className="btn-secondary btn-sm flex-1"
                  >
                    No procesar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarProcesada}
                    disabled={procesando === ventaSeleccionada.id}
                    className="btn-primary btn-sm flex-1"
                  >
                    {procesando === ventaSeleccionada.id ? 'Guardando...' : 'Sí, procesar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Segmentado<T extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: T
  opciones: { valor: T; etiqueta: string }[]
  onChange: (valor: T) => void
}) {
  return (
    <div className="flex flex-1 gap-1 rounded-lg bg-slate-100 p-1">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            valor === opcion.valor ? 'bg-white text-ink-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
