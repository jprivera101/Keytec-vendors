import { useState } from 'react'
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
import { VisitaCard } from '../shared/VisitaCard'
import type { AdminOutletContext } from './AdminLayout'
import type { CountryCode } from '../../lib/types'

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

  const regionesQuery = useQuery({
    queryKey: ['regiones-tiendas', pais],
    queryFn: () => obtenerRegionesPorPais(pais as CountryCode),
    enabled: pais !== 'ALL',
  })

  const tiendasQuery = useQuery({
    queryKey: ['tiendas-stats', pais, regionId],
    queryFn: () => obtenerTiendasConEstadisticas(pais, regionId),
  })

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
              <th className="px-4 py-3 font-medium">Lugar</th>
              <th className="px-4 py-3 font-medium">Región</th>
              <th className="px-4 py-3 font-medium">Visitas</th>
              <th className="px-4 py-3 font-medium">Total vendido</th>
              <th className="px-4 py-3 font-medium">Última visita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tiendasQuery.data?.map((tienda) => (
              <tr key={tienda.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/admin/tiendas/${tienda.id}`} className="hover:text-brand-700">
                    {tienda.name}
                  </Link>
                </td>
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
            {tiendasQuery.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
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
