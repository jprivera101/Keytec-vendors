import { useQuery } from '@tanstack/react-query'
import { obtenerSemanaPorId, obtenerVisitasConVentas } from '../../lib/api'
import { Spinner } from '../../components/Spinner'
import { MapaRuta } from './MapaRuta'
import { VisitaCard } from './VisitaCard'

export function DetalleSemana({ weekId }: { weekId: string }) {
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
        <StatCard etiqueta="Total vendido" valor={`Q${totalVentas.toFixed(2)}`} />
      </div>

      <MapaRuta visitas={visitas} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-500">Visitas</h3>
        <div className="space-y-3">
          {visitas.map((visita) => (
            <VisitaCard key={visita.id} visita={visita} puedeAgregarVenta={false} onAgregarVenta={() => {}} />
          ))}
          {visitas.length === 0 && <p className="text-sm text-slate-400">Sin visitas registradas.</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-slate-400">{etiqueta}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{valor}</p>
    </div>
  )
}
