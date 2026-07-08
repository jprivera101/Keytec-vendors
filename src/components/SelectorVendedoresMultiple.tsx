import { useState } from 'react'
import { Flag } from './flags'
import type { Profile } from '../lib/types'

interface Props {
  vendedores: Profile[]
  seleccionados: string[]
  onChange: (ids: string[]) => void
}

/** Lista con casillas + buscador, para asignar uno o mas vendedores a un operario. */
export function SelectorVendedoresMultiple({ vendedores, seleccionados, onChange }: Props) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = vendedores.filter((v) =>
    v.full_name.toLowerCase().includes(busqueda.trim().toLowerCase()),
  )

  function alternar(id: string) {
    onChange(
      seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id],
    )
  }

  return (
    <div>
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar vendedor..."
        className="input-field mb-2"
      />
      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
        {filtrados.map((vendedor) => (
          <label
            key={vendedor.id}
            className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={seleccionados.includes(vendedor.id)}
              onChange={() => alternar(vendedor.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600/40"
            />
            <span className="flex-1 truncate">{vendedor.full_name}</span>
            {vendedor.country && <Flag country={vendedor.country} size={13} />}
          </label>
        ))}
        {filtrados.length === 0 && (
          <p className="p-3 text-center text-xs text-slate-400">Sin resultados</p>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        {seleccionados.length} vendedor{seleccionados.length !== 1 && 'es'} seleccionado
        {seleccionados.length !== 1 && 's'}
      </p>
    </div>
  )
}
