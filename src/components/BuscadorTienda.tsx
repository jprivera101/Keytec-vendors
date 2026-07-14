import { useState } from 'react'
import { NUEVA_TIENDA } from '../lib/tiendaConstants'
import type { Store } from '../lib/types'

interface Props {
  tiendas: Store[]
  valor: string
  onSeleccionar: (id: string) => void
}

/** Input con autocompletado para elegir la tienda dentro de un lugar: mas facil de usar que
 * un <select> plano cuando un lugar acumula muchas tiendas. Siempre incluye "+ Nueva tienda"
 * al final de los resultados. */
export function BuscadorTienda({ tiendas, valor, onSeleccionar }: Props) {
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)

  const seleccionada = valor === NUEVA_TIENDA ? null : tiendas.find((t) => t.id === valor)
  const textoSeleccion = valor === NUEVA_TIENDA ? '+ Nueva tienda' : (seleccionada?.name ?? '')
  const filtradas = tiendas.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="relative w-full">
      <input
        type="text"
        required
        value={abierto ? query : textoSeleccion}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setQuery('')
          setAbierto(true)
        }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar tienda..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
      />

      {abierto && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtradas.map((tienda) => (
            <li key={tienda.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onSeleccionar(tienda.id)
                  setAbierto(false)
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                  tienda.id === valor ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'
                }`}
              >
                {tienda.name}
              </button>
            </li>
          ))}
          {filtradas.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">Sin resultados</li>
          )}
          <li className="border-t border-slate-100">
            <button
              type="button"
              onMouseDown={() => {
                onSeleccionar(NUEVA_TIENDA)
                setAbierto(false)
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                valor === NUEVA_TIENDA ? 'bg-brand-50 font-medium text-brand-700' : 'text-brand-700'
              }`}
            >
              + Nueva tienda
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
