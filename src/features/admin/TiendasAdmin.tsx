import { useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  obtenerTiendaPorId,
  obtenerTiendasConEstadisticas,
  obtenerVisitasDeTienda,
} from '../../lib/tiendas'
import { obtenerRegionesPorPais } from '../../lib/regiones'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { IconTiendas } from '../../components/icons'
import { Flag } from '../../components/flags'
import { VisitaCard } from '../shared/VisitaCard'
import type { AdminOutletContext } from './AdminLayout'
import type { CountryCode, TiendaConEstadisticas } from '../../lib/types'

type CampoOrden = 'visitas' | 'ventas' | 'ultimaVisita'
type Orden = { campo: CampoOrden; direccion: 'asc' | 'desc' }

function ordenarTiendas(tiendas: TiendaConEstadisticas[], orden: Orden) {
  const factor = orden.direccion === 'asc' ? 1 : -1
  return [...tiendas].sort((a, b) => {
    if (orden.campo === 'visitas') return (a.totalVisitas - b.totalVisitas) * factor
    if (orden.campo === 'ventas') return (a.totalVentas - b.totalVentas) * factor
    // Última visita: las tiendas sin visitas quedan siempre al final, sin importar la dirección.
    const av = a.ultimaVisita ? new Date(a.ultimaVisita).getTime() : -Infinity
    const bv = b.ultimaVisita ? new Date(b.ultimaVisita).getTime() : -Infinity
    return (av - bv) * factor
  })
}

export function TiendasAdmin() {
  const { pais } = useOutletContext<AdminOutletContext>()
  const { storeId } = useParams<{ storeId?: string }>()

  return (
    <div className="space-y-4">
      {storeId ? <DetalleTienda storeId={storeId} /> : <ListaTiendas pais={pais} />}
    </div>
  )
}

function ListaTiendas({ pais }: { pais: AdminOutletContext['pais'] }) {
  const [regionId, setRegionId] = useState<string | 'ALL'>('ALL')
  const [orden, setOrden] = useState<Orden>({ campo: 'ultimaVisita', direccion: 'desc' })

  const regionesQuery = useQuery({
    queryKey: ['regiones-tiendas', pais],
    queryFn: () => obtenerRegionesPorPais(pais as CountryCode),
    enabled: pais !== 'ALL',
  })

  const tiendasQuery = useQuery({
    queryKey: ['tiendas-stats', pais, regionId],
    queryFn: () => obtenerTiendasConEstadisticas(pais, regionId),
  })

  const tiendasOrdenadas = useMemo(
    () => ordenarTiendas(tiendasQuery.data ?? [], orden),
    [tiendasQuery.data, orden],
  )

  function alternarOrden(campo: CampoOrden) {
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

      <div className="card overflow-hidden">
        {tiendasQuery.isLoading && <Spinner />}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Tienda</th>
              {pais === 'ALL' && <th className="px-4 py-3 font-medium">País</th>}
              <th className="px-4 py-3 font-medium">Lugar</th>
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
            {tiendasOrdenadas.map((tienda) => (
              <tr key={tienda.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/admin/tiendas/${tienda.id}`} className="hover:text-brand-700">
                    {tienda.name}
                  </Link>
                </td>
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
            {tiendasOrdenadas.length === 0 && (
              <tr>
                <td colSpan={pais === 'ALL' ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-400">
                  Todavía no hay tiendas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
  campo: CampoOrden
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

function DetalleTienda({ storeId }: { storeId: string }) {
  const tiendaQuery = useQuery({
    queryKey: ['tienda', storeId],
    queryFn: () => obtenerTiendaPorId(storeId),
  })
  const visitasQuery = useQuery({
    queryKey: ['visitas-tienda', storeId],
    queryFn: () => obtenerVisitasDeTienda(storeId),
  })

  const totalVentas = (visitasQuery.data ?? []).reduce(
    (suma, v) => suma + v.sales.reduce((s, venta) => s + Number(venta.amount), 0),
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Visitas</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{visitasQuery.data?.length ?? 0}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Total vendido</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{formatMonto(totalVentas, tiendaQuery.data?.country)}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Historial de visitas</h2>
        {visitasQuery.isLoading && <Spinner />}
        <div className="space-y-3">
          {visitasQuery.data?.map((visita) => (
            <VisitaCard
              key={visita.id}
              visita={visita}
              puedeAgregarVenta={false}
              onAgregarVenta={() => {}}
              country={tiendaQuery.data?.country}
            />
          ))}
          {visitasQuery.data?.length === 0 && (
            <p className="text-sm text-slate-400">Sin visitas registradas todavía.</p>
          )}
        </div>
      </div>
    </>
  )
}
