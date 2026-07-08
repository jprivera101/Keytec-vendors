import { useQuery } from '@tanstack/react-query'
import { obtenerSemanaPorId, obtenerVisitasConVentas } from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { FotoPrivada } from '../../components/FotoPrivada'
import { MapaRuta } from './MapaRuta'
import { VisitaCard } from './VisitaCard'
import type { CountryCode, TiendaConLugar } from '../../lib/types'

export function DetalleSemana({
  weekId,
  tiendasRegion,
  country,
  puedeAgregarVenta = false,
  onAgregarVenta = () => {},
}: {
  weekId: string
  tiendasRegion?: TiendaConLugar[]
  country?: CountryCode | null
  puedeAgregarVenta?: boolean
  onAgregarVenta?: (visitId: string) => void
}) {
  const semanaQuery = useQuery({
    queryKey: ['semana', weekId],
    queryFn: () => obtenerSemanaPorId(weekId),
  })

  const visitasQuery = useQuery({
    queryKey: ['visitas', weekId],
    queryFn: () => obtenerVisitasConVentas(weekId),
  })

  if (semanaQuery.isLoading || visitasQuery.isLoading) return <Spinner texto="Cargando semana..." />
  if (!semanaQuery.data) return <p className="p-4 text-sm text-red-600">No se encontró la semana</p>

  const semana = semanaQuery.data
  const visitas = visitasQuery.data ?? []
  const totalVentas = visitas.reduce(
    (suma, v) => suma + v.sales.reduce((s, venta) => s + Number(venta.amount), 0),
    0,
  )
  const kmRecorridos =
    semana.end_mileage_km != null ? semana.end_mileage_km - semana.start_mileage_km : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          etiqueta="Estado"
          valor={semana.status === 'active' ? 'Activa' : 'Completada'}
        />
        <StatCard etiqueta="Km recorridos" valor={kmRecorridos != null ? `${kmRecorridos} km` : '—'} />
        <StatCard etiqueta="Visitas" valor={String(visitas.length)} />
        <StatCard etiqueta="Total vendido" valor={formatMonto(totalVentas, country)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FotoKilometraje etiqueta="Kilometraje inicial" km={semana.start_mileage_km} path={semana.start_mileage_photo_path} />
        <FotoKilometraje etiqueta="Kilometraje final" km={semana.end_mileage_km} path={semana.end_mileage_photo_path} />
      </div>

      <MapaRuta visitas={visitas} tiendasRegion={tiendasRegion} country={country} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-500">Visitas</h3>
        <div className="space-y-3">
          {visitas.map((visita) => (
            <VisitaCard
              key={visita.id}
              visita={visita}
              puedeAgregarVenta={puedeAgregarVenta}
              onAgregarVenta={onAgregarVenta}
              country={country}
            />
          ))}
          {visitas.length === 0 && <p className="text-sm text-slate-400">Sin visitas registradas.</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs text-slate-400">{etiqueta}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{valor}</p>
    </div>
  )
}

function FotoKilometraje({
  etiqueta,
  km,
  path,
}: {
  etiqueta: string
  km: number | null
  path: string | null
}) {
  return (
    <div className="card p-3">
      <p className="mb-2 text-xs text-slate-400">
        {etiqueta} {km != null && <span className="font-semibold text-slate-700">· {km} km</span>}
      </p>
      {path ? (
        <FotoPrivada
          bucket="mileage-photos"
          path={path}
          alt={etiqueta}
          className="h-32 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
          Sin foto
        </div>
      )}
    </div>
  )
}
