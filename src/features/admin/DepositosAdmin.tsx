import { Fragment, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { obtenerVendedores, obtenerDepositosDeVendedoresEnRango } from '../../lib/api'
import { obtenerUrlFirmada } from '../../lib/storage'
import { fechaLocalISO } from '../../lib/fechas'
import { PageHeader } from '../../components/PageHeader'
import { Spinner } from '../../components/Spinner'
import { Segmentado } from '../../components/Segmentado'
import { IconDepositos, IconChevron } from '../../components/icons'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode, Deposito } from '../../lib/types'

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const NOMBRE_ARCHIVO_INVALIDO = /[^a-z0-9-_]+/gi

function slug(texto: string) {
  return texto.trim().replace(/\s+/g, '-').replace(NOMBRE_ARCHIVO_INVALIDO, '')
}

type ModoMes = 'actual' | 'anteriores'

function mesISOActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

function mesISOAnterior(): string {
  const hoy = new Date()
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  return `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`
}

/** Límites [primer día del mes, primer día del mes siguiente) para el mes "AAAA-MM" dado. */
function rangoDesdeMesISO(valor: string): {
  desde: string
  hasta: string
  desdeFecha: Date
  hastaFecha: Date
} {
  const [anioStr, mesStr] = valor.split('-')
  const anio = Number(anioStr)
  const mes = Number(mesStr) - 1
  const desdeFecha = new Date(anio, mes, 1)
  const hastaFecha = new Date(anio, mes + 1, 1)
  return { desde: desdeFecha.toISOString(), hasta: hastaFecha.toISOString(), desdeFecha, hastaFecha }
}

export function DepositosAdmin() {
  const { pais, region } = useOutletContext<AdminOutletContext>()
  const [modoMes, setModoMes] = useState<ModoMes>('actual')
  const [mesElegido, setMesElegido] = useState(mesISOAnterior())
  const [descargando, setDescargando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  function alternarExpandido(vendedorId: string) {
    setExpandidos((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(vendedorId)) nuevo.delete(vendedorId)
      else nuevo.add(vendedorId)
      return nuevo
    })
  }

  const mesISO = modoMes === 'actual' ? mesISOActual() : mesElegido
  const { desde, hasta, desdeFecha } = rangoDesdeMesISO(mesISO)

  const vendedoresQuery = useQuery({
    queryKey: ['vendedores', pais, region],
    queryFn: () => obtenerVendedores(pais, region),
  })
  const vendedores = (vendedoresQuery.data ?? []).filter((v) => v.active)
  const vendedorIds = vendedores.map((v) => v.id)

  const depositosQuery = useQuery({
    queryKey: ['depositos-admin', vendedorIds, desde, hasta],
    queryFn: () => obtenerDepositosDeVendedoresEnRango(vendedorIds, desde, hasta),
    enabled: vendedorIds.length > 0,
  })

  const depositosPorVendedor = new Map<string, Deposito[]>()
  for (const deposito of depositosQuery.data ?? []) {
    if (!depositosPorVendedor.has(deposito.salesman_id)) depositosPorVendedor.set(deposito.salesman_id, [])
    depositosPorVendedor.get(deposito.salesman_id)!.push(deposito)
  }

  const totalDepositos = depositosQuery.data?.length ?? 0
  const etiquetaMes = desdeFecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })

  async function manejarDescargarUno(deposito: Deposito) {
    setError(null)
    setDescargando(deposito.id)
    try {
      const url = await obtenerUrlFirmada('deposit-photos', deposito.photo_path)
      const blob = await (await fetch(url)).blob()
      const fecha = fechaLocalISO(deposito.created_at)
      const nombre = deposito.label ? `${slug(deposito.label)}-` : ''
      descargarBlob(blob, `deposito-${nombre}${fecha}.jpg`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconDepositos />}
        color="brand"
        title="Depósitos"
        subtitle="Revisa y descarga los depósitos de efectivo del equipo por mes."
      />

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
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
        <p className="text-sm text-slate-500">{totalDepositos} depósito{totalDepositos !== 1 && 's'} este mes</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        {(vendedoresQuery.isLoading || depositosQuery.isLoading) && <Spinner />}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              {pais === 'ALL' && <th className="px-4 py-3 font-medium">País</th>}
              <th className="px-4 py-3 font-medium">Región</th>
              <th className="px-4 py-3 font-medium">Depósitos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendedores.map((vendedor) => {
              const depositos = depositosPorVendedor.get(vendedor.id) ?? []
              const cantidad = depositos.length
              const expandido = expandidos.has(vendedor.id)
              return (
                <Fragment key={vendedor.id}>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => cantidad > 0 && alternarExpandido(vendedor.id)}
                        disabled={cantidad === 0}
                        className="flex items-center gap-1.5 disabled:cursor-default"
                      >
                        {cantidad > 0 && (
                          <IconChevron
                            className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
                            width={14}
                            height={14}
                          />
                        )}
                        {vendedor.full_name}
                      </button>
                    </td>
                    {pais === 'ALL' && (
                      <td className="px-4 py-3 text-slate-500">
                        {vendedor.country ? NOMBRE_PAIS[vendedor.country as CountryCode] : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-500">{vendedor.region_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{cantidad}</td>
                  </tr>
                  {expandido && (
                    <tr>
                      <td colSpan={pais === 'ALL' ? 4 : 3} className="bg-slate-50 px-4 py-3">
                        <ul className="divide-y divide-slate-200">
                          {depositos.map((deposito) => (
                            <li key={deposito.id} className="flex items-center justify-between gap-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-700">
                                  💰 {deposito.label || 'Depósito'}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {new Date(deposito.created_at).toLocaleString('es-GT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => manejarDescargarUno(deposito)}
                                disabled={descargando !== null}
                                className="btn-secondary btn-sm shrink-0"
                              >
                                {descargando === deposito.id ? 'Preparando...' : '⬇ Descargar'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {vendedores.length === 0 && (
              <tr>
                <td colSpan={pais === 'ALL' ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-400">
                  No hay vendedores activos en este alcance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
