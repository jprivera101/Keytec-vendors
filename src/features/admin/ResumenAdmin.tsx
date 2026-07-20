import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import {
  obtenerResumenAdmin,
  obtenerComparativoSemanal,
  obtenerComparativoMensual,
  obtenerTopLugaresDelMes,
} from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { TablaComparativoVendedores } from '../../components/TablaComparativoVendedores'
import { IconResumen } from '../../components/icons'
import { Flag } from '../../components/flags'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode, TopLugarDelMes } from '../../lib/types'

const acentos = ['bg-brand-700', 'bg-ink-700', 'bg-[#0092D2]']

type Vista = 'semana' | 'mes'

export function ResumenAdmin() {
  const { pais, region } = useOutletContext<AdminOutletContext>()
  const [vista, setVista] = useState<Vista>('semana')
  const resumenQuery = useQuery({
    queryKey: ['resumen-admin', pais, region],
    queryFn: () => obtenerResumenAdmin(pais, region),
  })
  const comparativoSemanalQuery = useQuery({
    queryKey: ['comparativo-semanal', pais, region],
    queryFn: () => obtenerComparativoSemanal(pais, region),
    enabled: vista === 'semana',
  })
  const comparativoMensualQuery = useQuery({
    queryKey: ['comparativo-mensual', pais, region],
    queryFn: () => obtenerComparativoMensual(pais, region),
    enabled: vista === 'mes',
  })
  // A propósito sin "region": la idea es ver el lugar que más vendió en todo el país, sin
  // que el filtro de ruta del panel lateral lo esconda.
  const topLugaresQuery = useQuery({
    queryKey: ['top-lugares-mes', pais],
    queryFn: () => obtenerTopLugaresDelMes(pais),
    enabled: vista === 'mes',
  })

  if (resumenQuery.isLoading) return <Spinner texto="Cargando resumen..." />
  const resumen = resumenQuery.data
  if (!resumen) return null

  // Nunca se suman Quetzales con Dólares: si se ven "Todos" los países, se muestran los dos
  // totales por separado en vez de un número mezclado sin sentido.
  const paisesAMostrar: CountryCode[] = pais === 'ALL' ? ['GT', 'SV'] : [pais]

  // El mes actual no tiene tarjetas propias en el backend: se derivan de la misma consulta
  // que ya alimenta la tabla "vs mes pasado" (comparativoMensualQuery), sin pedir nada extra.
  const datosMes = comparativoMensualQuery.data ?? []
  const vendedoresConActividadMes = datosMes.filter((v) => v.actual !== null).length
  const visitasMes = datosMes.reduce((suma, v) => suma + (v.actual?.totalVisitas ?? 0), 0)
  const ventasMesPorPais: Partial<Record<CountryCode, number>> = {}
  for (const v of datosMes) {
    if (v.actual && v.country) {
      ventasMesPorPais[v.country] = (ventasMesPorPais[v.country] ?? 0) + v.actual.totalVentas
    }
  }
  const ventasPorVendedorMes = datosMes
    .filter((v) => v.actual && v.actual.totalVentas > 0)
    .map((v) => ({ nombre: v.nombre, total: v.actual!.totalVentas, country: v.country }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconResumen />}
        color="ink"
        title="Resumen"
        subtitle="Estado de las rutas activas ahora mismo."
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setVista('semana')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            vista === 'semana' ? 'bg-white text-ink-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Semana activa
        </button>
        <button
          type="button"
          onClick={() => setVista('mes')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            vista === 'mes' ? 'bg-white text-ink-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Mes actual
        </button>
      </div>

      {vista === 'mes' ? (
        <>
          <TarjetasResumen
            vendedoresActivos={resumen.vendedoresActivos}
            etiquetaSegunda="Vendedores con ruta este mes"
            valorSegunda={String(vendedoresConActividadMes)}
            etiquetaVisitas="Visitas este mes"
            totalVisitas={visitasMes}
            etiquetaVentas="Ventas este mes"
            ventasPorPais={ventasMesPorPais}
            paisesAMostrar={paisesAMostrar}
            tituloVentasPorVendedor="Ventas por vendedor (mes actual)"
            ventasPorVendedor={ventasPorVendedorMes}
            sinVentasTexto="Nadie ha registrado ventas este mes todavía."
          />

          {topLugaresQuery.isLoading ? (
            <Spinner texto="Cargando top lugares..." />
          ) : (
            <TopLugares lugares={topLugaresQuery.data ?? []} paisesAMostrar={paisesAMostrar} />
          )}

          {comparativoMensualQuery.isLoading ? (
            <Spinner texto="Cargando comparativo mensual..." />
          ) : (
            <TablaComparativoVendedores
              titulo="Mes actual vs. mes pasado"
              etiquetaActual="mes actual"
              etiquetaAnterior="mes pasado"
              filas={comparativoMensualQuery.data ?? []}
            />
          )}
        </>
      ) : (
        <>
          <TarjetasResumen
            vendedoresActivos={resumen.vendedoresActivos}
            etiquetaSegunda="Rutas activas"
            valorSegunda={String(resumen.rutasActivas)}
            etiquetaVisitas="Visitas en ruta"
            totalVisitas={resumen.visitasEnRuta}
            etiquetaVentas="Ventas en ruta"
            ventasPorPais={resumen.ventasEnRutaPorPais}
            paisesAMostrar={paisesAMostrar}
            tituloVentasPorVendedor="Ventas por vendedor (rutas activas)"
            ventasPorVendedor={resumen.ventasPorVendedor}
            sinVentasTexto="Nadie ha registrado ventas en la ruta activa todavía."
          />

          {comparativoSemanalQuery.isLoading ? (
            <Spinner texto="Cargando comparativo semanal..." />
          ) : (
            <TablaComparativoVendedores
              titulo="Semana activa vs. semana pasada"
              etiquetaActual="semana activa"
              etiquetaAnterior="semana pasada"
              filas={comparativoSemanalQuery.data ?? []}
              mostrarKmActual={false}
            />
          )}
        </>
      )}
    </div>
  )
}

/** Las 4 tarjetas + la barra "ventas por vendedor" de arriba — mismo layout para la vista de
 * semana activa (datos en vivo) y la de mes actual (acumulado), solo cambian las etiquetas y
 * los números que reciben. */
function TarjetasResumen({
  vendedoresActivos,
  etiquetaSegunda,
  valorSegunda,
  etiquetaVisitas,
  totalVisitas,
  etiquetaVentas,
  ventasPorPais,
  paisesAMostrar,
  tituloVentasPorVendedor,
  ventasPorVendedor,
  sinVentasTexto,
}: {
  vendedoresActivos: number
  etiquetaSegunda: string
  valorSegunda: string
  etiquetaVisitas: string
  totalVisitas: number
  etiquetaVentas: string
  ventasPorPais: Partial<Record<CountryCode, number>>
  paisesAMostrar: CountryCode[]
  tituloVentasPorVendedor: string
  ventasPorVendedor: { nombre: string; total: number; country: CountryCode | null }[]
  sinVentasTexto: string
}) {
  const tiles = [
    { etiqueta: 'Vendedores activos', valor: String(vendedoresActivos) },
    { etiqueta: etiquetaSegunda, valor: valorSegunda },
    { etiqueta: etiquetaVisitas, valor: String(totalVisitas) },
  ]
  const maxVenta = Math.max(1, ...ventasPorVendedor.map((v) => v.total))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <div key={tile.etiqueta} className="card p-4">
            <div className={`mb-3 h-1.5 w-8 rounded-full ${acentos[i]}`} />
            <p className="text-sm text-slate-500">{tile.etiqueta}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{tile.valor}</p>
          </div>
        ))}
        <div className="card p-4">
          <div className="mb-3 h-1.5 w-8 rounded-full bg-highlight-400" />
          <p className="text-sm text-slate-500">{etiquetaVentas}</p>
          <div className={paisesAMostrar.length > 1 ? 'mt-1 space-y-0.5' : 'mt-1'}>
            {paisesAMostrar.map((c) => (
              <p
                key={c}
                className={`flex items-baseline gap-1.5 font-semibold text-slate-900 ${
                  paisesAMostrar.length > 1 ? 'text-lg' : 'text-2xl'
                }`}
              >
                <span className="truncate">{formatMonto(ventasPorPais[c] ?? 0, c)}</span>
                {paisesAMostrar.length > 1 && (
                  <span className="shrink-0 text-xs font-normal text-slate-400">{c}</span>
                )}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-500">{tituloVentasPorVendedor}</h2>
        {ventasPorVendedor.length === 0 ? (
          <p className="text-sm text-slate-400">{sinVentasTexto}</p>
        ) : (
          <ul className="space-y-3">
            {ventasPorVendedor.map((fila) => (
              <li key={fila.nombre} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-slate-600" title={fila.nombre}>
                  {fila.nombre}
                </span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-brand-700"
                    style={{ width: `${Math.max(4, (fila.total / maxVenta) * 100)}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right text-sm font-medium text-slate-700">
                  {formatMonto(fila.total, fila.country)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

const TOP_N = 3

/** Top 3 lugares por venta del mes, a propósito sin importar la ruta (se muestra como dato
 * informativo junto al nombre del lugar). Se separa por país cuando se ven "Todos", porque
 * nunca se suman Quetzales con Dólares. */
function TopLugares({
  lugares,
  paisesAMostrar,
}: {
  lugares: TopLugarDelMes[]
  paisesAMostrar: CountryCode[]
}) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-500">Top 3 lugares (mes actual)</h2>
      <div className={paisesAMostrar.length > 1 ? 'space-y-5' : ''}>
        {paisesAMostrar.map((c) => {
          const top = lugares.filter((l) => l.country === c).slice(0, TOP_N)
          return (
            <div key={c}>
              {paisesAMostrar.length > 1 && (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Flag country={c} size={13} />
                  {NOMBRE_PAIS[c]}
                </p>
              )}
              {top.length === 0 ? (
                <p className="text-sm text-slate-400">Sin ventas todavía.</p>
              ) : (
                <ol className="space-y-3">
                  {top.map((lugar, i) => (
                    <li key={lugar.placeId} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{lugar.placeName}</p>
                        <p className="truncate text-xs text-slate-400">{lugar.routeName ?? 'Sin ruta'}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-900">
                        {formatMonto(lugar.total, lugar.country)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
