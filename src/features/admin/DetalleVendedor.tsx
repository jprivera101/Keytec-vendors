import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { obtenerSemanasDeVendedor, obtenerVendedores } from '../../lib/api'
import { Spinner } from '../../components/Spinner'
import { DetalleSemana } from '../shared/DetalleSemana'

export function DetalleVendedor() {
  const { salesmanId, weekId } = useParams<{ salesmanId: string; weekId?: string }>()

  const vendedoresQuery = useQuery({ queryKey: ['vendedores'], queryFn: obtenerVendedores })
  const vendedor = vendedoresQuery.data?.find((v) => v.id === salesmanId)

  const semanasQuery = useQuery({
    queryKey: ['semanas-vendedor', salesmanId],
    queryFn: () => obtenerSemanasDeVendedor(salesmanId!),
    enabled: !!salesmanId,
  })

  return (
    <div className="mx-auto min-h-full max-w-2xl bg-slate-50 pb-10">
      <header className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm sm:px-6">
        <Link to={weekId ? `/admin/vendedor/${salesmanId}` : '/admin'} className="text-brand-700">
          ← Volver
        </Link>
        <h1 className="font-semibold text-slate-900">{vendedor?.full_name ?? 'Vendedor'}</h1>
      </header>

      <main className="space-y-4 p-4 sm:p-6">
        {weekId ? (
          <DetalleSemana weekId={weekId} />
        ) : (
          <>
            <h2 className="px-1 text-sm font-semibold text-slate-500">Semanas</h2>
            {semanasQuery.isLoading && <Spinner />}
            <div className="space-y-2">
              {semanasQuery.data?.map((semana) => (
                <Link
                  key={semana.id}
                  to={`/admin/vendedor/${salesmanId}/semana/${semana.id}`}
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
                <p className="text-sm text-slate-400">Este vendedor aún no tiene semanas registradas.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
