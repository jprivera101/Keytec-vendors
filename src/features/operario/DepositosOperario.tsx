import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { obtenerVendedoresAsignados, obtenerDepositosDeOperario } from '../../lib/operarios'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { IconDepositos } from '../../components/icons'
import { DepositoCard } from '../shared/DepositoCard'

export function DepositosOperario() {
  const { profile } = useAuth()
  const [vendedorFiltro, setVendedorFiltro] = useState<string | 'ALL'>('ALL')

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores-asignados', profile!.id],
    queryFn: () => obtenerVendedoresAsignados(profile!.id),
  })
  const vendedores = vendedoresQuery.data ?? []
  const nombrePorId = new Map(vendedores.map((v) => [v.id, v.full_name]))

  const depositosQuery = useQuery({
    queryKey: ['depositos-operario', vendedores.map((v) => v.id)],
    queryFn: () => obtenerDepositosDeOperario(vendedores.map((v) => v.id)),
    enabled: vendedores.length > 0,
  })

  const depositos = (depositosQuery.data ?? []).filter(
    (d) => vendedorFiltro === 'ALL' || d.salesman_id === vendedorFiltro,
  )

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconDepositos />}
        color="brand"
        title="Depósitos"
        subtitle="Depósitos de efectivo de tus vendedores asignados."
      />

      <div className="card p-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Vendedor</label>
        <select
          value={vendedorFiltro}
          onChange={(e) => setVendedorFiltro(e.target.value)}
          className="input-field"
        >
          <option value="ALL">Todos mis vendedores</option>
          {vendedores.map((vendedor) => (
            <option key={vendedor.id} value={vendedor.id}>
              {vendedor.full_name}
            </option>
          ))}
        </select>
      </div>

      {vendedoresQuery.isLoading || depositosQuery.isLoading ? (
        <Spinner />
      ) : depositos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
          No hay depósitos que coincidan con este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {depositos.map((deposito) => (
            <DepositoCard
              key={deposito.id}
              deposito={deposito}
              vendedorNombre={nombrePorId.get(deposito.salesman_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
