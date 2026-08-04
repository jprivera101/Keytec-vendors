import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { obtenerVendedoresAsignados } from '../../lib/operarios'
import { obtenerDepositosDeVendedoresEnRango } from '../../lib/api'
import { mesISOActual, mesISOAnterior, rangoDesdeMesISO } from '../../lib/fechas'
import { Spinner } from '../../components/Spinner'
import { PageHeader } from '../../components/PageHeader'
import { Segmentado } from '../../components/Segmentado'
import { IconDepositos } from '../../components/icons'
import { DepositoCard } from '../shared/DepositoCard'

type ModoMes = 'actual' | 'anteriores'

export function DepositosOperario() {
  const { profile } = useAuth()
  const [vendedorFiltro, setVendedorFiltro] = useState<string | 'ALL'>('ALL')
  const [modoMes, setModoMes] = useState<ModoMes>('actual')
  const [mesElegido, setMesElegido] = useState(mesISOAnterior())

  const mesISO = modoMes === 'actual' ? mesISOActual() : mesElegido
  const { desde, hasta, desdeFecha } = rangoDesdeMesISO(mesISO)
  const etiquetaMes = desdeFecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores-asignados', profile!.id],
    queryFn: () => obtenerVendedoresAsignados(profile!.id),
  })
  const vendedores = vendedoresQuery.data ?? []
  const nombrePorId = new Map(vendedores.map((v) => [v.id, v.full_name]))
  const vendedorIds = vendedores.map((v) => v.id)

  const depositosQuery = useQuery({
    queryKey: ['depositos-operario', vendedorIds, desde, hasta],
    queryFn: () => obtenerDepositosDeVendedoresEnRango(vendedorIds, desde, hasta),
    enabled: vendedorIds.length > 0,
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

      <div className="card space-y-4 p-4">
        <div>
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

        <div className="border-t border-slate-100 pt-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Mes</label>
          <Segmentado
            valor={modoMes}
            opciones={[
              { valor: 'actual', etiqueta: 'Mes actual' },
              { valor: 'anteriores', etiqueta: 'Meses anteriores' },
            ]}
            onChange={setModoMes}
          />
          {modoMes === 'anteriores' && (
            <input
              type="month"
              value={mesElegido}
              max={mesISOAnterior()}
              onChange={(e) => setMesElegido(e.target.value)}
              className="input-field mt-2"
            />
          )}
          <p className="mt-1 text-xs capitalize text-slate-400">{etiquetaMes}</p>
        </div>
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
              puedeDescargar
            />
          ))}
        </div>
      )}
    </div>
  )
}
