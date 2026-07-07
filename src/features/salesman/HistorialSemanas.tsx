import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { obtenerHistorialSemanas } from '../../lib/api'
import { Spinner } from '../../components/Spinner'
import { DetalleSemana } from '../shared/DetalleSemana'

export function HistorialSemanas() {
  const { profile } = useAuth()
  const { weekId } = useParams()

  const semanasQuery = useQuery({
    queryKey: ['historial-semanas', profile!.id],
    queryFn: () => obtenerHistorialSemanas(profile!.id),
  })

  return (
    <div className="mx-auto min-h-full max-w-md bg-slate-50 pb-10">
      <header className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <Link to={weekId ? '/vendedor/historial' : '/vendedor'} className="text-brand-700">
          ← Volver
        </Link>
        <h1 className="font-semibold text-slate-900">Historial de semanas</h1>
      </header>

      <main className="p-4">
        {weekId ? (
          <DetalleSemana weekId={weekId} />
        ) : (
          <>
            {semanasQuery.isLoading && <Spinner />}
            <div className="space-y-2">
              {semanasQuery.data?.map((semana) => (
                <Link
                  key={semana.id}
                  to={`/vendedor/historial/${semana.id}`}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
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
                  <span className="text-slate-400">→</span>
                </Link>
              ))}
              {semanasQuery.data?.length === 0 && (
                <p className="text-sm text-slate-400">Aún no tienes semanas registradas.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
