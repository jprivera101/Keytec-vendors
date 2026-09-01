import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  obtenerVendedores,
  obtenerRangoFechasConDatos,
  obtenerReporteVendedor,
  obtenerReportesDeVendedores,
} from '../../lib/api'
import { fechaLocalISO, fechaDesdeISO } from '../../lib/fechas'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { IconReporte } from '../../components/icons'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'

const DIAS_RANGO_POR_DEFECTO = 29 // últimos 30 días (hoy - 29) al abrir la página.

export function ReporteriaAdmin() {
  const { pais, region } = useOutletContext<AdminOutletContext>()
  const [desde, setDesde] = useState<string | null>(null)
  const [hasta, setHasta] = useState<string | null>(null)
  const [generandoConsolidado, setGenerandoConsolidado] = useState(false)
  const [generandoId, setGenerandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores-reporteria', pais, region],
    queryFn: () => obtenerVendedores(pais, region),
  })
  const rangoQuery = useQuery({
    queryKey: ['rango-fechas-reporteria', pais],
    queryFn: () => obtenerRangoFechasConDatos(pais),
  })

  const rango = rangoQuery.data
  const hoy = fechaLocalISO()
  const maxFecha = rango?.maxFecha ?? hoy
  const maxFechaObj = fechaDesdeISO(maxFecha)
  const hace30dias = fechaLocalISO(
    new Date(maxFechaObj.getFullYear(), maxFechaObj.getMonth(), maxFechaObj.getDate() - DIAS_RANGO_POR_DEFECTO),
  )
  const minFecha = rango?.minFecha ?? hace30dias
  const desdePorDefecto = minFecha > hace30dias ? minFecha : hace30dias

  const desdeEfectivo = desde ?? desdePorDefecto
  const hastaEfectivo = hasta ?? maxFecha

  const etiquetaAlcance =
    pais === 'ALL' ? 'Guatemala y El Salvador' : NOMBRE_PAIS[pais]

  async function descargarIndividual(vendedorId: string) {
    setError(null)
    setGenerandoId(vendedorId)
    try {
      const [reporte, { generarReportePdf }] = await Promise.all([
        obtenerReporteVendedor(vendedorId, desdeEfectivo, hastaEfectivo),
        import('../../lib/reportePdf'),
      ])
      await generarReportePdf(reporte)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerandoId(null)
    }
  }

  async function descargarConsolidado() {
    const vendedores = vendedoresQuery.data ?? []
    if (vendedores.length === 0) return
    setError(null)
    setGenerandoConsolidado(true)
    try {
      const [reportes, { generarReporteConsolidadoPdf }] = await Promise.all([
        obtenerReportesDeVendedores(vendedores.map((v) => v.id), desdeEfectivo, hastaEfectivo),
        import('../../lib/reportePdf'),
      ])
      await generarReporteConsolidadoPdf(reportes, { etiquetaAlcance, desde: desdeEfectivo, hasta: hastaEfectivo })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerandoConsolidado(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconReporte />}
        color="ink"
        title="Reportería"
        subtitle="Descarga el reporte de ventas de un vendedor, o de todo el equipo, para un rango de fechas."
      />

      <div className="card space-y-3 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Desde</label>
            <input
              type="date"
              value={desdeEfectivo}
              min={minFecha}
              max={hastaEfectivo}
              onChange={(e) => setDesde(e.target.value)}
              className="input-field text-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Hasta</label>
            <input
              type="date"
              value={hastaEfectivo}
              min={desdeEfectivo}
              max={maxFecha}
              onChange={(e) => setHasta(e.target.value)}
              className="input-field text-base"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-slate-900">Reporte consolidado</p>
          <p className="text-sm text-slate-500">Un solo PDF con el resumen y el detalle de {etiquetaAlcance}.</p>
        </div>
        <button
          type="button"
          onClick={descargarConsolidado}
          disabled={generandoConsolidado || (vendedoresQuery.data ?? []).length === 0}
          className="btn-primary shrink-0 px-4 py-2.5"
        >
          {generandoConsolidado ? 'Generando...' : 'Descargar consolidado'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
          Reporte individual por vendedor
        </h2>
        {vendedoresQuery.isLoading ? (
          <Spinner />
        ) : (vendedoresQuery.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No hay vendedores en este filtro.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {vendedoresQuery.data!.map((vendedor) => (
              <li key={vendedor.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${vendedor.active ? '' : 'opacity-50'}`}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{vendedor.full_name}</p>
                  {vendedor.region_name && <p className="truncate text-xs text-slate-400">{vendedor.region_name}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => descargarIndividual(vendedor.id)}
                  disabled={generandoId === vendedor.id}
                  className="btn-secondary btn-sm shrink-0"
                >
                  {generandoId === vendedor.id ? 'Generando...' : 'Descargar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
