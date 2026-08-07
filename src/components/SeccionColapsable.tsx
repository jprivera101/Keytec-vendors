import { useState, type ReactNode } from 'react'
import { IconChevron } from './icons'

/** Sección colapsada por defecto: el título muestra la cantidad para dar una idea del
 * tamaño sin tener que desplegarla primero (evita abrumar con, por ejemplo, 40+ visitas). */
export function SeccionColapsable({
  titulo,
  cantidad,
  children,
  abiertoPorDefecto = false,
}: {
  titulo: string
  cantidad: number
  children: ReactNode
  abiertoPorDefecto?: boolean
}) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto)
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <h3 className="text-sm font-semibold text-slate-500">
          {titulo} <span className="text-slate-400">({cantidad})</span>
        </h3>
        <IconChevron className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && <div className="space-y-3 border-t border-slate-100 p-3">{children}</div>}
    </div>
  )
}
