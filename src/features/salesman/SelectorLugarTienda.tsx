import { BuscadorTienda } from '../../components/BuscadorTienda'
import { NUEVO_LUGAR, NUEVA_TIENDA } from '../../lib/tiendaConstants'
import type { Place, Store } from '../../lib/types'

export { NUEVO_LUGAR, NUEVA_TIENDA }

interface Props {
  lugares: Place[]
  tiendas: Store[]
  lugarId: string
  nuevoLugarNombre: string
  tiendaId: string
  nuevaTiendaNombre: string
  onLugarIdChange: (id: string) => void
  onNuevoLugarNombreChange: (nombre: string) => void
  onTiendaIdChange: (id: string) => void
  onNuevaTiendaNombreChange: (nombre: string) => void
}

/**
 * Dos listas desplegables en cascada: primero el lugar (Sanarate, Zacapa...), luego la
 * tienda dentro de ese lugar. Ambas con opcion de "agregar nuevo" si es la primera vez.
 * La foto/ubicacion se siguen capturando en la visita como siempre; esto solo reemplaza
 * el campo de texto libre "nombre de la tienda".
 */
export function SelectorLugarTienda({
  lugares,
  tiendas,
  lugarId,
  nuevoLugarNombre,
  tiendaId,
  nuevaTiendaNombre,
  onLugarIdChange,
  onNuevoLugarNombreChange,
  onTiendaIdChange,
  onNuevaTiendaNombreChange,
}: Props) {
  const esLugarNuevo = lugarId === NUEVO_LUGAR
  const hayLugarSeleccionado = lugarId !== '' && !esLugarNuevo

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Lugar</label>
        <select
          required
          value={lugarId}
          onChange={(e) => {
            onLugarIdChange(e.target.value)
            onTiendaIdChange('')
            onNuevaTiendaNombreChange('')
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
        >
          <option value="" disabled>
            Selecciona un lugar
          </option>
          {lugares.map((lugar) => (
            <option key={lugar.id} value={lugar.id}>
              {lugar.name}
            </option>
          ))}
          <option value={NUEVO_LUGAR}>+ Nuevo lugar</option>
        </select>
        {esLugarNuevo && (
          <input
            type="text"
            required
            autoFocus
            placeholder="Nombre del nuevo lugar"
            value={nuevoLugarNombre}
            onChange={(e) => onNuevoLugarNombreChange(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
          />
        )}
      </div>

      {esLugarNuevo && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la tienda</label>
          <input
            type="text"
            required
            placeholder="Nombre de la tienda"
            value={nuevaTiendaNombre}
            onChange={(e) => onNuevaTiendaNombreChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">Como es un lugar nuevo, también es la primera tienda ahí.</p>
        </div>
      )}

      {hayLugarSeleccionado && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tienda</label>
          <BuscadorTienda tiendas={tiendas} valor={tiendaId} onSeleccionar={onTiendaIdChange} />
          {tiendaId === NUEVA_TIENDA && (
            <input
              type="text"
              required
              autoFocus
              placeholder="Nombre de la nueva tienda"
              value={nuevaTiendaNombre}
              onChange={(e) => onNuevaTiendaNombreChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
            />
          )}
        </div>
      )}
    </div>
  )
}
