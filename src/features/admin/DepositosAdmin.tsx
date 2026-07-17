import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import JSZip from 'jszip'
import { obtenerVendedores, obtenerDepositosDeVendedoresEnRango } from '../../lib/api'
import { obtenerUrlFirmada } from '../../lib/storage'
import { semanaISOActual, rangoDesdeSemanaISO } from '../../lib/semanaISO'
import { PageHeader } from '../../components/PageHeader'
import { Spinner } from '../../components/Spinner'
import { IconDepositos } from '../../components/icons'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode, Deposito, VendedorConRegion } from '../../lib/types'

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

async function agregarDepositosAZip(zip: JSZip, depositos: Deposito[]) {
  for (const [i, deposito] of depositos.entries()) {
    const url = await obtenerUrlFirmada('deposit-photos', deposito.photo_path)
    const blob = await (await fetch(url)).blob()
    const fecha = deposito.created_at.slice(0, 10)
    zip.file(`deposito-${fecha}-${i + 1}.jpg`, blob)
  }
}

// La descarga arma el ZIP en el navegador del admin, foto por foto y de forma secuencial:
// con una semana muy activa esto puede tardar bastante y colgar la pestaña. Por eso se avisa
// pasado un umbral y se bloquea el botón de "todos" en un extremo, sugiriendo bajar por
// vendedor en su lugar (no es un límite de seguridad, es para no trabar el navegador).
const LIMITE_ADVERTENCIA_TOTAL = 150
const LIMITE_MAXIMO_TOTAL = 500

const NOMBRE_ARCHIVO_INVALIDO = /[^a-z0-9-_]+/gi

function slug(texto: string) {
  return texto.trim().replace(/\s+/g, '-').replace(NOMBRE_ARCHIVO_INVALIDO, '')
}

export function DepositosAdmin() {
  const { pais, region } = useOutletContext<AdminOutletContext>()
  const [semanaISO, setSemanaISO] = useState(semanaISOActual())
  const [descargando, setDescargando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { desde, hasta, desdeFecha, hastaFecha } = rangoDesdeSemanaISO(semanaISO)
  const hastaMostrar = new Date(hastaFecha.getTime() - 86400000)

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
  const etiquetaSemana = `${desdeFecha.toLocaleDateString('es-GT')} – ${hastaMostrar.toLocaleDateString('es-GT')}`

  async function manejarDescargarVendedor(vendedor: VendedorConRegion) {
    const depositos = depositosPorVendedor.get(vendedor.id) ?? []
    if (depositos.length === 0) return
    setError(null)
    setDescargando(vendedor.id)
    try {
      const zip = new JSZip()
      await agregarDepositosAZip(zip, depositos)
      const blob = await zip.generateAsync({ type: 'blob' })
      descargarBlob(blob, `depositos-${slug(vendedor.full_name)}-${semanaISO}.zip`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDescargando(null)
    }
  }

  async function manejarDescargarTodos() {
    if (totalDepositos === 0 || totalDepositos > LIMITE_MAXIMO_TOTAL) return
    setError(null)
    setDescargando('__todos__')
    try {
      const zip = new JSZip()
      for (const vendedor of vendedores) {
        const depositos = depositosPorVendedor.get(vendedor.id) ?? []
        if (depositos.length === 0) continue
        const carpeta = zip.folder(slug(vendedor.full_name))!
        await agregarDepositosAZip(carpeta, depositos)
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      descargarBlob(blob, `depositos-semana-${semanaISO}.zip`)
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
        subtitle="Revisa y descarga los depósitos de efectivo del equipo por semana."
      />

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Semana</label>
          <input
            type="week"
            value={semanaISO}
            onChange={(e) => setSemanaISO(e.target.value)}
            className="input-field"
          />
          <p className="mt-1 text-xs text-slate-400">{etiquetaSemana}</p>
        </div>
        <button
          type="button"
          onClick={manejarDescargarTodos}
          disabled={totalDepositos === 0 || totalDepositos > LIMITE_MAXIMO_TOTAL || descargando !== null}
          className="btn-primary"
        >
          {descargando === '__todos__' ? 'Preparando ZIP...' : `⬇ Descargar todos (${totalDepositos})`}
        </button>
      </div>

      {totalDepositos > LIMITE_MAXIMO_TOTAL && (
        <p className="text-sm text-amber-600">
          Hay demasiados depósitos ({totalDepositos}) para descargarlos todos a la vez. Descarga por
          vendedor en la tabla de abajo, o elige una semana más corta.
        </p>
      )}
      {totalDepositos > LIMITE_ADVERTENCIA_TOTAL && totalDepositos <= LIMITE_MAXIMO_TOTAL && (
        <p className="text-sm text-amber-600">
          Esta semana tiene {totalDepositos} depósitos: la descarga puede tardar varios minutos.
        </p>
      )}

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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendedores.map((vendedor) => {
              const cantidad = depositosPorVendedor.get(vendedor.id)?.length ?? 0
              return (
                <tr key={vendedor.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{vendedor.full_name}</td>
                  {pais === 'ALL' && (
                    <td className="px-4 py-3 text-slate-500">
                      {vendedor.country ? NOMBRE_PAIS[vendedor.country as CountryCode] : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-500">{vendedor.region_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{cantidad}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => manejarDescargarVendedor(vendedor)}
                      disabled={cantidad === 0 || descargando !== null}
                      className="btn-secondary btn-sm"
                    >
                      {descargando === vendedor.id ? 'Preparando...' : 'Descargar ZIP'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {vendedores.length === 0 && (
              <tr>
                <td colSpan={pais === 'ALL' ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-400">
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
