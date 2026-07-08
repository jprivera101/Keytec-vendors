import type { ReactNode } from 'react'

type Color = 'ink' | 'brand' | 'celeste' | 'highlight'

const ESTILOS: Record<Color, string> = {
  ink: 'bg-ink-50 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  celeste: 'bg-[#0092D2]/10 text-[#0092D2]',
  highlight: 'bg-highlight-400/20 text-ink-700',
}

interface Props {
  icon: ReactNode
  color: Color
  title: string
  subtitle?: string
  action?: ReactNode
}

/** Encabezado de página con un icono en una placa de color, para que cada sección se
 * distinga de un vistazo en vez de ser todo el mismo tono de gris sobre blanco. */
export function PageHeader({ icon, color, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ESTILOS[color]}`}>
          {icon}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
