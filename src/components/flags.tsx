import type { CountryCode } from '../lib/types'

// Windows no dibuja los emoji de bandera (🇬🇹/🇸🇻) — el font Segoe UI Emoji no trae esos
// glifos y muestra solo las letras sueltas. Se reemplazan por banderas vectoriales propias.
interface FlagProps {
  size?: number
  className?: string
}

function FlagGT({ size = 18, className }: FlagProps) {
  const alto = size
  const ancho = Math.round(size * 1.5)
  return (
    <svg width={ancho} height={alto} viewBox="0 0 30 20" className={`rounded-[3px] ${className ?? ''}`}>
      <rect width="30" height="20" fill="white" />
      <rect width="10" height="20" fill="#4997D0" />
      <rect x="20" width="10" height="20" fill="#4997D0" />
    </svg>
  )
}

function FlagSV({ size = 18, className }: FlagProps) {
  const alto = size
  const ancho = Math.round(size * 1.5)
  return (
    <svg width={ancho} height={alto} viewBox="0 0 30 20" className={`rounded-[3px] ${className ?? ''}`}>
      <rect width="30" height="20" fill="white" />
      <rect width="30" height="6.67" fill="#0047AB" />
      <rect y="13.33" width="30" height="6.67" fill="#0047AB" />
    </svg>
  )
}

const BANDERAS: Record<CountryCode, (props: FlagProps) => React.JSX.Element> = {
  GT: FlagGT,
  SV: FlagSV,
}

export function Flag({ country, size, className }: { country: CountryCode } & FlagProps) {
  const Bandera = BANDERAS[country]
  return <Bandera size={size} className={className} />
}
