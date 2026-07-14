import type { ReactNode } from 'react'

type Color = 'ink' | 'brand' | 'celeste' | 'highlight'

// Solo el color del trazo del icono — nunca un bloque de color de fondo. Un icono a línea
// dentro de una placa pastel por página es el patrón "dashboard genérico"; aquí el color
// vive únicamente en el trazo, sobre una placa neutra con borde fino.
const COLOR_ICONO: Record<Color, string> = {
  ink: 'text-ink-700',
  brand: 'text-brand-700',
  celeste: 'text-[#0092D2]',
  highlight: 'text-highlight-500',
}

interface Props {
  icon: ReactNode
  color: Color
  title: string
  subtitle?: string
  action?: ReactNode
}

/** Encabezado de página: icono a línea (color solo en el trazo, sin placa de color) + título
 * + una línea inferior que separa el encabezado del contenido — sin bloques de color. */
export function PageHeader({ icon, color, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white ${COLOR_ICONO[color]}`}
        >
          {icon}
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
