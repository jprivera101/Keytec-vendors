import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { obtenerHistorialSemanas } from '../../lib/api'
import { Spinner } from '../../components/Spinner'
import { ResumenRuta } from './ResumenRuta'
import { IconChevron, IconHistorial } from '../../components/icons'

export function HistorialSemanas() {
  const { profile } = useAuth()
  const { weekId } = useParams()

  const semanasQuery = useQuery({
    queryKey: ['historial-semanas', profile!.id],
    queryFn: () => obtenerHistorialSemanas(profile!.id),
  })

  return (
    <div>
      {weekId ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Link to="/vendedor/historial" className="btn-ghost btn-sm">
              ← Volver
            </Link>
            <h1 className="font-semibold text-slate-900">Detalle de la semana</h1>
          </div>
          <ResumenRuta weekId={weekId} />
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-700">
              <IconHistorial width={20} height={20} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Historial de semanas</h1>
              <p className="text-sm text-slate-500">Revisa tus semanas anteriores completadas.</p>
            </div>
          </div>
          {semanasQuery.isLoading && <Spinner />}
          <div className="space-y-2">
            {semanasQuery.data?.map((semana) => (
              <Link
                key={semana.id}
                to={`/vendedor/historial/${semana.id}`}
                className="card flex items-center justify-between p-4 transition-colors hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {new Date(semana.start_date).toLocaleDateString('es-GT')}
                    {semana.end_date && ` – ${new Date(semana.end_date).toLocaleDateString('es-GT')}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {semana.status === 'active' ? 'Semana activa' : 'Completada'}
                  </p>
                </div>
                <IconChevron className="-rotate-90 text-slate-400" />
              </Link>
            ))}
            {semanasQuery.data?.length === 0 && (
              <p className="text-sm text-slate-400">Aún no tienes semanas registradas.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
