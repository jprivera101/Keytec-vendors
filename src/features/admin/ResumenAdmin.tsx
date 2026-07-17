import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { obtenerResumenAdmin, obtenerComparativoSemanal, obtenerComparativoMensual } from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { TablaComparativoVendedores } from '../../components/TablaComparativoVendedores'
import { IconResumen } from '../../components/icons'
import type { AdminOutletContext } from './AdminLayout'
import type { CountryCode } from '../../lib/types'

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

  if (resumenQuery.isLoading) return <Spinner texto="Cargando resumen..." />
  const resumen = resumenQuery.data
  if (!resumen) return null

  const tiles = [
    { etiqueta: 'Vendedores activos', valor: String(resumen.vendedoresActivos) },
    { etiqueta: 'Rutas activas', valor: String(resumen.rutasActivas) },
    { etiqueta: 'Visitas en ruta', valor: String(resumen.visitasEnRuta) },
  ]

  // Nunca se suman Quetzales con Dólares: si se ven "Todos" los países, se muestran los dos
  // totales por separado en vez de un número mezclado sin sentido.
  const paisesAMostrar: CountryCode[] = pais === 'ALL' ? ['GT', 'SV'] : [pais]

  const maxVenta = Math.max(1, ...resumen.ventasPorVendedor.map((v) => v.total))

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
        comparativoMensualQuery.isLoading ? (
          <Spinner texto="Cargando comparativo mensual..." />
        ) : (
          <TablaComparativoVendedores
            titulo="Mes actual vs. mes pasado"
            etiquetaActual="mes actual"
            etiquetaAnterior="mes pasado"
            filas={comparativoMensualQuery.data ?? []}
          />
        )
      ) : (
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
              <p className="text-sm text-slate-500">Ventas en ruta</p>
              <div className={paisesAMostrar.length > 1 ? 'mt-1 space-y-0.5' : 'mt-1'}>
                {paisesAMostrar.map((c) => (
                  <p
                    key={c}
                    className={`flex items-baseline gap-1.5 font-semibold text-slate-900 ${
                      paisesAMostrar.length > 1 ? 'text-lg' : 'text-2xl'
                    }`}
                  >
                    <span className="truncate">{formatMonto(resumen.ventasEnRutaPorPais[c] ?? 0, c)}</span>
                    {paisesAMostrar.length > 1 && (
                      <span className="shrink-0 text-xs font-normal text-slate-400">{c}</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-500">Ventas por vendedor (rutas activas)</h2>
            {resumen.ventasPorVendedor.length === 0 ? (
              <p className="text-sm text-slate-400">Nadie ha registrado ventas en la ruta activa todavía.</p>
            ) : (
              <ul className="space-y-3">
                {resumen.ventasPorVendedor.map((fila) => (
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

          {comparativoSemanalQuery.isLoading ? (
            <Spinner texto="Cargando comparativo semanal..." />
          ) : (
            <TablaComparativoVendedores
              titulo="Semana activa vs. semana pasada"
              etiquetaActual="semana activa"
              etiquetaAnterior="semana pasada"
              filas={comparativoSemanalQuery.data ?? []}
            />
          )}
        </>
      )}
    </div>
  )
}
