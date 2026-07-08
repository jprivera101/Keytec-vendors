import { useQuery } from '@tanstack/react-query'
import { obtenerSemanaPorId, obtenerVisitasConVentas } from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { useAuth } from '../../lib/useAuth'
import { Spinner } from '../../components/Spinner'
import { VisitaCard } from '../shared/VisitaCard'

interface Props {
  weekId: string
  puedeAgregarVenta?: boolean
  onAgregarVenta?: (visitId: string) => void
}

/** Vista simple para el vendedor: un resumen limpio de la semana (visitas, tiendas distintas,
 * total vendido, km recorridos) y sus visitas en formato compacto. Sin mapa ni fotos grandes
 * de por medio — esas quedan para Analítica, que es la vista detallada del admin. */
export function ResumenRuta({ weekId, puedeAgregarVenta = false, onAgregarVenta = () => {} }: Props) {
  const { profile } = useAuth()
  const semanaQuery = useQuery({
    queryKey: ['semana', weekId],
    queryFn: () => obtenerSemanaPorId(weekId),
  })
  const visitasQuery = useQuery({
    queryKey: ['visitas', weekId],
    queryFn: () => obtenerVisitasConVentas(weekId),
  })

  if (semanaQuery.isLoading || visitasQuery.isLoading) return <Spinner texto="Cargando..." />
  if (!semanaQuery.data) return <p className="text-sm text-red-600">No se encontró la semana</p>

  const semana = semanaQuery.data
  const visitas = visitasQuery.data ?? []
  const totalVentas = visitas.reduce(
    (suma, v) => suma + v.sales.reduce((s, venta) => s + Number(venta.amount), 0),
    0,
  )
  const tiendasDistintas = new Set(visitas.map((v) => v.store_id ?? v.store_name ?? v.id)).size
  const kmRecorridos =
    semana.end_mileage_km != null ? semana.end_mileage_km - semana.start_mileage_km : null

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-ink-700 via-brand-700 to-highlight-400" />
        <div className="flex items-center justify-between p-4">
          <div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                semana.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {semana.status === 'active' ? '● Ruta activa' : 'Ruta completada'}
            </span>
            <p className="mt-1.5 text-xs text-slate-400">
              Desde {new Date(semana.start_date).toLocaleDateString('es-GT')}
              {semana.end_date && ` hasta ${new Date(semana.end_date).toLocaleDateString('es-GT')}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{formatMonto(totalVentas, profile?.country)}</p>
            <p className="text-xs text-slate-400">total vendido</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile etiqueta="Visitas" valor={String(visitas.length)} />
        <StatTile etiqueta="Tiendas" valor={String(tiendasDistintas)} />
        <StatTile etiqueta="Km recorridos" valor={kmRecorridos != null ? `${kmRecorridos}` : '—'} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-500">Visitas</h3>
        <div className="space-y-3">
          {visitas.map((visita) => (
            <VisitaCard
              key={visita.id}
              visita={visita}
              puedeAgregarVenta={puedeAgregarVenta}
              onAgregarVenta={onAgregarVenta}
              country={profile?.country}
            />
          ))}
          {visitas.length === 0 && <p className="text-sm text-slate-400">Sin visitas registradas.</p>}
        </div>
      </div>
    </div>
  )
}

function StatTile({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xl font-bold text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{etiqueta}</p>
    </div>
  )
}
