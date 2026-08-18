import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  obtenerConteoTiendas,
  obtenerConteoTiendasPorPais,
  obtenerTiendaPorId,
  obtenerTiendasConEstadisticas,
  obtenerVisitasDeTienda,
  TIENDAS_POR_PAGINA,
} from '../../lib/tiendas'
import { obtenerRegionesPorPais } from '../../lib/regiones'
import { formatMonto } from '../../lib/currency'
import { fechaLocalISO } from '../../lib/fechas'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { SeccionColapsable } from '../../components/SeccionColapsable'
import { IconTiendas } from '../../components/icons'
import { Flag } from '../../components/flags'
import { NOMBRE_PAIS } from './AdminLayout'
import { VisitaCard } from '../shared/VisitaCard'
import type { AdminOutletContext } from './AdminLayout'
import type { CampoOrdenTiendas } from '../../lib/tiendas'
import type { CountryCode, VisitWithSales } from '../../lib/types'

type Orden = { campo: CampoOrdenTiendas; direccion: 'asc' | 'desc' }

export function TiendasAdmin() {
  const { pais } = useOutletContext<AdminOutletContext>()
  const { storeId } = useParams<{ storeId?: string }>()

  return (
    <div className="space-y-4">
      {storeId ? (
        <DetalleTienda storeId={storeId} puedeGestionarVentas />
      ) : (
        <ListaTiendas pais={pais} />
      )}
    </div>
  )
}

function ListaTiendas({ pais }: { pais: AdminOutletContext['pais'] }) {
  const [regionId, setRegionId] = useState<string | 'ALL'>('ALL')
  const [orden, setOrden] = useState<Orden>({ campo: 'ultimaVisita', direccion: 'desc' })
  const [pagina, setPagina] = useState(0)

  // Si cambia el filtro o el orden, la pagina en la que estabamos ya no tiene sentido (podria
  // quedar mas alla del ultimo resultado del nuevo filtro).
  useEffect(() => {
    setPagina(0)
  }, [pais, regionId, orden])

  const regionesQuery = useQuery({
    queryKey: ['regiones-tiendas', pais],
    queryFn: () => obtenerRegionesPorPais(pais as CountryCode),
    enabled: pais !== 'ALL',
  })

  const tiendasQuery = useQuery({
    queryKey: ['tiendas-stats', pais, regionId, pagina, orden],
    queryFn: () => obtenerTiendasConEstadisticas(pais, regionId, pagina, orden),
  })

  // Conteo aparte (en vez del total que ya trae tiendasQuery): con "Todos" países y muchas
  // tiendas registradas, la lista paginada es mas lenta de traer, pero el total en si es un
  // dato liviano que no debería depender de que la tabla haya terminado de cargar.
  const conteoQuery = useQuery({
    queryKey: ['tiendas-conteo', pais, regionId],
    queryFn: () => obtenerConteoTiendas(pais, regionId),
  })
  const conteoPorPaisQuery = useQuery({
    queryKey: ['tiendas-conteo-por-pais'],
    queryFn: () => obtenerConteoTiendasPorPais(),
    enabled: pais === 'ALL' && regionId === 'ALL',
  })

  const tiendas = tiendasQuery.data?.tiendas ?? []
  const totalPaginas = Math.max(1, Math.ceil((tiendasQuery.data?.total ?? 0) / TIENDAS_POR_PAGINA))

  function alternarOrden(campo: CampoOrdenTiendas) {
    setOrden((actual) =>
      actual.campo === campo
        ? { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
        : { campo, direccion: 'desc' },
    )
  }

  return (
    <>
      <PageHeader
        icon={<IconTiendas />}
        color="celeste"
        title="Tiendas"
        subtitle="Clientes reconocidos por ubicación, con su historial de visitas y ventas."
        action={
          pais !== 'ALL' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Mostrar</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="input-field sm:w-56"
              >
                <option value="ALL">Todas las tiendas</option>
                {regionesQuery.data?.map((region) => (
                  <option key={region.id} value={region.id}>
                    Región: {region.name}
                  </option>
                ))}
              </select>
            </div>
          )
        }
      />

      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <div>
          <p className="text-xs text-slate-400">Total tiendas{regionId !== 'ALL' ? ' en esta región' : ''}</p>
          <p className="mt-0.5 text-2xl font-semibold text-slate-900">
            {conteoQuery.isLoading ? '…' : (conteoQuery.data ?? 0)}
          </p>
        </div>
        {pais === 'ALL' && regionId === 'ALL' && conteoPorPaisQuery.data && (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {(['GT', 'SV'] as const).map((c) => (
              <p key={c} className="flex items-center gap-1.5 text-sm text-slate-500">
                <Flag country={c} size={14} />
                {NOMBRE_PAIS[c]}
                <span className="font-semibold text-slate-700">{conteoPorPaisQuery.data[c] ?? 0}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {tiendasQuery.isLoading && <Spinner />}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Tienda</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              {pais === 'ALL' && <th className="px-4 py-3 font-medium">País</th>}
              <EncabezadoOrdenable
                etiqueta="Lugar"
                campo="lugar"
                orden={orden}
                onClick={() => alternarOrden('lugar')}
              />
              <th className="px-4 py-3 font-medium">Región</th>
              <EncabezadoOrdenable
                etiqueta="Visitas"
                campo="visitas"
                orden={orden}
                onClick={() => alternarOrden('visitas')}
              />
              <EncabezadoOrdenable
                etiqueta="Total vendido"
                campo="ventas"
                orden={orden}
                onClick={() => alternarOrden('ventas')}
              />
              <EncabezadoOrdenable
                etiqueta="Última visita"
                campo="ultimaVisita"
                orden={orden}
                onClick={() => alternarOrden('ultimaVisita')}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tiendasQuery.isError && (
              <tr>
                <td colSpan={pais === 'ALL' ? 9 : 8} className="px-4 py-6 text-center text-sm text-red-600">
                  No se pudieron cargar las tiendas: {(tiendasQuery.error as Error)?.message ?? 'error desconocido'}.
                </td>
              </tr>
            )}
            {tiendas.map((tienda) => (
              <tr key={tienda.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/admin/tiendas/${tienda.id}`} className="hover:text-brand-700">
                    {tienda.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{tienda.client_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{tienda.phone ?? '—'}</td>
                {pais === 'ALL' && (
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Flag country={tienda.country} size={14} />
                      {tienda.country}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-slate-500">{tienda.placeName ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{tienda.regionName ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{tienda.totalVisitas}</td>
                <td className="px-4 py-3 text-slate-500">{formatMonto(tienda.totalVentas, tienda.country)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {tienda.ultimaVisita
                    ? new Date(tienda.ultimaVisita).toLocaleDateString('es-GT')
                    : '—'}
                </td>
              </tr>
            ))}
            {!tiendasQuery.isError && !tiendasQuery.isLoading && tiendas.length === 0 && (
              <tr>
                <td colSpan={pais === 'ALL' ? 9 : 8} className="px-4 py-6 text-center text-sm text-slate-400">
                  Todavía no hay tiendas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {tiendas.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <p>
              Página {pagina + 1} de {totalPaginas} · {tiendasQuery.data?.total ?? 0} tiendas
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={pagina >= totalPaginas - 1}
                className="btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function EncabezadoOrdenable({
  etiqueta,
  campo,
  orden,
  onClick,
}: {
  etiqueta: string
  campo: CampoOrdenTiendas
  orden: Orden
  onClick: () => void
}) {
  const activo = orden.campo === campo
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 whitespace-nowrap ${
          activo ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {etiqueta}
        <span className="text-[10px]">{activo ? (orden.direccion === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  )
}

/** Nombre del mes+año en que cayó la visita, para agrupar el historial (que puede acumular
 * años de visitas) en bloques manejables en vez de una sola lista larguísima. */
function claveMes(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
}

function DetalleTienda({ storeId, puedeGestionarVentas }: { storeId: string; puedeGestionarVentas: boolean }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const tiendaQuery = useQuery({
    queryKey: ['tienda', storeId],
    queryFn: () => obtenerTiendaPorId(storeId),
  })
  const visitasQuery = useQuery({
    queryKey: ['visitas-tienda', storeId],
    queryFn: () => obtenerVisitasDeTienda(storeId),
  })

  const visitasFiltradas = (visitasQuery.data ?? []).filter((v) => {
    const fecha = fechaLocalISO(v.captured_at)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })

  const gruposPorMes = new Map<string, VisitWithSales[]>()
  for (const visita of visitasFiltradas) {
    const clave = claveMes(visita.captured_at)
    if (!gruposPorMes.has(clave)) gruposPorMes.set(clave, [])
    gruposPorMes.get(clave)!.push(visita)
  }

  const totalVentas = visitasFiltradas.reduce(
    (suma, v) => suma + v.sales.filter((venta) => !venta.cancelled).reduce((s, venta) => s + Number(venta.amount), 0),
    0,
  )

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/admin/tiendas" className="btn-ghost btn-sm">
          ← Volver
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{tiendaQuery.data?.name ?? 'Tienda'}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Cliente</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{tiendaQuery.data?.client_name ?? '—'}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Teléfono</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{tiendaQuery.data?.phone ?? '—'}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Visitas</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{visitasFiltradas.length}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Total vendido</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{formatMonto(totalVentas, tiendaQuery.data?.country)}</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-500">Historial de visitas</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="input-field text-sm"
            />
            <span className="text-xs text-slate-400">a</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="input-field text-sm"
            />
            {(desde || hasta) && (
              <button
                type="button"
                onClick={() => {
                  setDesde('')
                  setHasta('')
                }}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {visitasQuery.isLoading && <Spinner />}

        <div className="space-y-3">
          {Array.from(gruposPorMes.entries()).map(([mes, visitasDelMes], i) => (
            <SeccionColapsable key={mes} titulo={mes} cantidad={visitasDelMes.length} abiertoPorDefecto={i === 0}>
              {visitasDelMes.map((visita) => (
                <VisitaCard
                  key={visita.id}
                  visita={visita}
                  puedeAgregarVenta={false}
                  onAgregarVenta={() => {}}
                  country={tiendaQuery.data?.country}
                  puedeGestionarVentas={puedeGestionarVentas}
                />
              ))}
            </SeccionColapsable>
          ))}
          {!visitasQuery.isLoading && visitasQuery.data?.length === 0 && (
            <p className="text-sm text-slate-400">Sin visitas registradas todavía.</p>
          )}
          {!visitasQuery.isLoading && (visitasQuery.data?.length ?? 0) > 0 && visitasFiltradas.length === 0 && (
            <p className="text-sm text-slate-400">Ninguna visita en el rango de fechas elegido.</p>
          )}
        </div>
      </div>
    </>
  )
}
