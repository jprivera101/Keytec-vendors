import { formatMonto } from '../lib/currency'
import type { ComparativoVendedor } from '../lib/types'

interface Props {
  titulo: string
  /** Ej. "semana activa" / "mes actual". */
  etiquetaActual: string
  /** Ej. "semana pasada" / "mes pasado". */
  etiquetaAnterior: string
  filas: ComparativoVendedor[]
}

/** Tabla "vs período pasado" por vendedor (Km recorridos, visitas, ventas). Cualquier
 * métrica que no se pueda calcular todavía (semana activa sin cerrar, o sin período
 * anterior con qué comparar) se deja en blanco a propósito, nunca como 0. */
export function TablaComparativoVendedores({ titulo, etiquetaActual, etiquetaAnterior, filas }: Props) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-500">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-slate-400">No hay datos para mostrar todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Vendedor</th>
                <th className="px-3 py-2 text-right font-medium">Km ({etiquetaActual})</th>
                <th className="px-3 py-2 text-right font-medium">Km ({etiquetaAnterior})</th>
                <th className="px-3 py-2 text-right font-medium">Visitas ({etiquetaActual})</th>
                <th className="px-3 py-2 text-right font-medium">Visitas ({etiquetaAnterior})</th>
                <th className="px-3 py-2 text-right font-medium">Ventas ({etiquetaActual})</th>
                <th className="px-3 py-2 text-right font-medium">Ventas ({etiquetaAnterior})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((fila) => (
                <tr key={fila.vendedorId}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{fila.nombre}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {fila.actual?.kmRecorridos != null ? `${fila.actual.kmRecorridos} km` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400">
                    {fila.anterior?.kmRecorridos != null ? `${fila.anterior.kmRecorridos} km` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {fila.actual ? fila.actual.totalVisitas : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400">
                    {fila.anterior ? fila.anterior.totalVisitas : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {fila.actual ? formatMonto(fila.actual.totalVentas, fila.country) : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400">
                    {fila.anterior ? formatMonto(fila.anterior.totalVentas, fila.country) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
