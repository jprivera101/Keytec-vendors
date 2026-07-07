import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { obtenerVendedores, obtenerSemanaActiva } from '../../lib/api'
import { Spinner } from '../../components/Spinner'
import type { Profile } from '../../lib/types'

export function PanelAdmin() {
  const { profile, cerrarSesion } = useAuth()

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores'],
    queryFn: obtenerVendedores,
  })

  return (
    <div className="mx-auto min-h-full max-w-2xl bg-slate-50 pb-10">
      <header className="flex items-center justify-between bg-white px-4 py-4 shadow-sm sm:px-6">
        <div>
          <p className="text-sm text-slate-500">Panel de administración</p>
          <p className="font-semibold text-slate-900">{profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/admin/crear-vendedor" className="font-medium text-brand-700">
            + Vendedor
          </Link>
          <button onClick={cerrarSesion} className="font-medium text-slate-400">
            Salir
          </button>
        </div>
      </header>

      <main className="space-y-3 p-4 sm:p-6">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Vendedores</h2>
        {vendedoresQuery.isLoading && <Spinner />}
        {vendedoresQuery.data?.map((vendedor) => (
          <FilaVendedor key={vendedor.id} vendedor={vendedor} />
        ))}
        {vendedoresQuery.data?.length === 0 && (
          <p className="text-sm text-slate-400">No hay vendedores registrados todavía.</p>
        )}
      </main>
    </div>
  )
}

function FilaVendedor({ vendedor }: { vendedor: Profile }) {
  const semanaQuery = useQuery({
    queryKey: ['semana-activa', vendedor.id],
    queryFn: () => obtenerSemanaActiva(vendedor.id),
  })

  return (
    <Link
      to={`/admin/vendedor/${vendedor.id}`}
      className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
    >
      <div>
        <p className="font-medium text-slate-900">{vendedor.full_name}</p>
        {vendedor.phone && <p className="text-xs text-slate-500">{vendedor.phone}</p>}
      </div>
      {semanaQuery.data ? (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          En ruta
        </span>
      ) : (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Sin semana activa
        </span>
      )}
    </Link>
  )
}
