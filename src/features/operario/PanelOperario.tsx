import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import {
  obtenerVentasOperario,
  obtenerVendedoresAsignados,
  marcarVentaProcesada,
  type VentaOperario,
} from '../../lib/operarios'
import { formatMonto } from '../../lib/currency'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { FotoPrivada } from '../../components/FotoPrivada'
import { PageHeader } from '../../components/PageHeader'
import { IconProcesar } from '../../components/icons'

type FiltroEstado = 'pendiente' | 'procesada' | 'todas'
type FiltroSemana = 'activa' | 'anteriores' | 'todas'

export function PanelOperario() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [vendedorFiltro, setVendedorFiltro] = useState<string | 'ALL'>('ALL')
  const [semanaFiltro, setSemanaFiltro] = useState<FiltroSemana>('activa')
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('pendiente')
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [ventaAConfirmar, setVentaAConfirmar] = useState<VentaOperario | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores-asignados', profile!.id],
    queryFn: () => obtenerVendedoresAsignados(profile!.id),
  })
  const ventasQuery = useQuery({
    queryKey: ['ventas-operario'],
    queryFn: obtenerVentasOperario,
  })

  async function marcar(venta: VentaOperario, procesada: boolean) {
    setError(null)
    setProcesando(venta.id)
    try {
      await marcarVentaProcesada(venta.id, procesada, profile!.id)
      await queryClient.invalidateQueries({ queryKey: ['ventas-operario'] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProcesando(null)
    }
  }

  async function confirmarProcesada() {
    if (!ventaAConfirmar) return
    const venta = ventaAConfirmar
    setVentaAConfirmar(null)
    await marcar(venta, true)
  }

  const ventas = (ventasQuery.data ?? []).filter((venta) => {
    if (vendedorFiltro !== 'ALL' && venta.salesmanId !== vendedorFiltro) return false
    if (semanaFiltro === 'activa' && venta.weekStatus !== 'active') return false
    if (semanaFiltro === 'anteriores' && venta.weekStatus !== 'completed') return false
    if (estadoFiltro === 'pendiente' && venta.processed) return false
    if (estadoFiltro === 'procesada' && !venta.processed) return false
    return true
  })

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconProcesar />}
        color="celeste"
        title="Ventas por procesar"
        subtitle="Revisa la foto de cada venta y márcala como procesada en el CRM."
      />

      <div className="card space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Vendedor</label>
          <select
            value={vendedorFiltro}
            onChange={(e) => setVendedorFiltro(e.target.value)}
            className="input-field"
          >
            <option value="ALL">Todos mis vendedores</option>
            {vendedoresQuery.data?.map((vendedor) => (
              <option key={vendedor.id} value={vendedor.id}>
                {vendedor.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Segmentado
            valor={semanaFiltro}
            opciones={[
              { valor: 'activa', etiqueta: 'Semana activa' },
              { valor: 'anteriores', etiqueta: 'Semanas anteriores' },
              { valor: 'todas', etiqueta: 'Todas' },
            ]}
            onChange={setSemanaFiltro}
          />
          <Segmentado
            valor={estadoFiltro}
            opciones={[
              { valor: 'pendiente', etiqueta: 'Pendientes' },
              { valor: 'procesada', etiqueta: 'Procesadas' },
              { valor: 'todas', etiqueta: 'Todas' },
            ]}
            onChange={(v) => setEstadoFiltro(v as FiltroEstado)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {ventasQuery.isLoading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
          No hay ventas que coincidan con este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map((venta) => (
            <div key={venta.id} className="card flex items-center gap-3 p-3">
              {venta.photoPath ? (
                <button type="button" onClick={() => setFotoAmpliada(venta.photoPath)} className="shrink-0">
                  <FotoPrivada
                    bucket="sale-photos"
                    path={venta.photoPath}
                    alt="Foto de la venta"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                </button>
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
                  Sin foto
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {venta.storeName || 'Tienda sin nombre'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {venta.salesmanName} ·{' '}
                  {new Date(venta.createdAt).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <p className="shrink-0 text-right font-bold text-slate-900">
                {formatMonto(venta.amount, venta.country)}
              </p>
              {venta.processed ? (
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                  ✓ Procesada
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setVentaAConfirmar(venta)}
                  disabled={procesando === venta.id}
                  className="btn-primary btn-sm shrink-0"
                >
                  {procesando === venta.id ? 'Guardando...' : 'Marcar procesada'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal titulo="Foto de la venta" abierto={!!fotoAmpliada} onCerrar={() => setFotoAmpliada(null)}>
        {fotoAmpliada && (
          <FotoPrivada
            bucket="sale-photos"
            path={fotoAmpliada}
            alt="Foto de la venta"
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>

      <Modal
        titulo="¿Confirmar procesado?"
        abierto={!!ventaAConfirmar}
        onCerrar={() => setVentaAConfirmar(null)}
      >
        {ventaAConfirmar && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Estás seguro que quieres marcar como procesada la venta de{' '}
              <span className="font-semibold text-slate-900">
                {ventaAConfirmar.storeName || 'Tienda sin nombre'}
              </span>{' '}
              por <span className="font-semibold text-slate-900">{formatMonto(ventaAConfirmar.amount, ventaAConfirmar.country)}</span>{' '}
              ({ventaAConfirmar.salesmanName})? Ya no podrás deshacer esto desde aquí.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVentaAConfirmar(null)}
                className="btn-secondary btn-sm flex-1"
              >
                Cancelar
              </button>
              <button type="button" onClick={confirmarProcesada} className="btn-primary btn-sm flex-1">
                Sí, procesar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Segmentado<T extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: T
  opciones: { valor: T; etiqueta: string }[]
  onChange: (valor: T) => void
}) {
  return (
    <div className="flex flex-1 gap-1 rounded-lg bg-slate-100 p-1">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            valor === opcion.valor ? 'bg-white text-ink-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
