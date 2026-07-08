import { useState } from 'react'
import type { Profile } from '../lib/types'

interface Props {
  vendedores: Profile[]
  valor: string
  onSeleccionar: (id: string) => void
  etiquetaPais?: (vendedor: Profile) => string | null
}

/** Input con autocompletado: mas facil de usar que un <select> plano cuando hay muchos vendedores. */
export function BuscadorVendedor({ vendedores, valor, onSeleccionar, etiquetaPais }: Props) {
  // "query" es solo lo que se esta escribiendo para filtrar; el texto que se ve cuando el
  // campo esta cerrado es el nombre del vendedor seleccionado, no query. Si se usara el mismo
  // valor para ambas cosas, al abrir el dropdown quedaria pre-llenado con el nombre ya
  // seleccionado y el filtro solo dejaria ver a ese mismo vendedor (ocultando al resto).
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)

  const seleccionado = vendedores.find((v) => v.id === valor)
  const filtrados = vendedores.filter((v) =>
    v.full_name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={abierto ? query : (seleccionado?.full_name ?? '')}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setQuery('')
          setAbierto(true)
        }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar vendedor..."
        className="input-field"
      />

      {abierto && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtrados.map((vendedor) => (
            <li key={vendedor.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onSeleccionar(vendedor.id)
                  setAbierto(false)
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                  vendedor.id === valor ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'
                }`}
              >
                <span>
                  {vendedor.full_name}
                  {!vendedor.active && <span className="ml-1 text-xs text-slate-400">(desactivado)</span>}
                </span>
                {etiquetaPais?.(vendedor) && (
                  <span className="text-xs text-slate-400">{etiquetaPais(vendedor)}</span>
                )}
              </button>
            </li>
          ))}
          {filtrados.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">Sin resultados</li>
          )}
        </ul>
      )}
    </div>
  )
}
