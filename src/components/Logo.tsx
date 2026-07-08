interface LogoProps {
  /** "icon": solo el isotipo a color. "full": isotipo + "KEY/TEC". */
  variant?: 'icon' | 'full'
  /** Version en blanco (mono), para usar sobre fondos de color segun el brandbook. */
  light?: boolean
  size?: number
  className?: string
}

/**
 * Isotipo de KeyTec redibujado a mano a partir de las imagenes de referencia del brandbook:
 * 4 trazos de "circuito" anidados (morado, amarillo, azul, celeste), cada uno con una pequeña
 * "pastilla" rectangular en su extremo abierto (como un pad de PCB). Si en algun momento se
 * cuenta con el archivo vectorial original, este es el unico componente que hay que reemplazar.
 */
function Isotipo({ light, size }: { light?: boolean; size: number }) {
  const morado = light ? 'currentColor' : '#382E88'
  const amarillo = light ? 'currentColor' : '#FFCE07'
  const azul = light ? 'currentColor' : '#2D77BD'
  const celeste = light ? 'currentColor' : '#0092D2'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 175 175"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Morado: bracket exterior (arriba + derecha) */}
      <g fill={morado}>
        <rect x="52" y="27" width="88" height="12" />
        <rect x="130" y="27" width="10" height="116" />
        <rect x="129" y="133" width="12" height="10" />
      </g>

      {/* Amarillo: bracket intermedio corto */}
      <g fill={amarillo}>
        <rect x="36" y="44" width="63" height="12" />
        <rect x="89" y="44" width="10" height="71" />
        <rect x="87" y="104" width="14" height="13" />
      </g>

      {/* Celeste: forma en U interior */}
      <g fill={celeste}>
        <rect x="68" y="61" width="14" height="7" />
        <rect x="69" y="64" width="12" height="15" />
        <rect x="107" y="42" width="16" height="6" />
        <rect x="109" y="44" width="12" height="77" />
        <rect x="70" y="109" width="51" height="12" />
        <rect x="70" y="79" width="11" height="42" />
      </g>

      {/* Azul: bracket exterior (izquierda + abajo) */}
      <g fill={azul}>
        <rect x="21" y="62" width="9" height="16" />
        <rect x="23" y="64" width="38" height="12" />
        <rect x="52" y="64" width="9" height="78" />
        <rect x="52" y="133" width="68" height="10" />
        <rect x="106" y="129" width="14" height="15" />
      </g>
    </svg>
  )
}

// Proporcion real del archivo del logo final (2510x1306), para escalar el <img> a partir
// de un alto ("size") sin deformarlo.
const PROPORCION_LOGO = 2510 / 1306

export function Logo({ variant = 'full', light = false, size = 36, className }: LogoProps) {
  if (variant === 'icon') {
    return (
      <span className={`${light ? 'text-white' : ''} ${className ?? ''}`}>
        <Isotipo light={light} size={size} />
      </span>
    )
  }

  const alto = size
  const ancho = Math.round(size * PROPORCION_LOGO)
  const imagen = (
    <img
      src="/logo-keytec.png"
      alt="KeyTec"
      width={ancho}
      height={alto}
      style={{ height: alto, width: ancho }}
      className="object-contain"
    />
  )

  if (!light) {
    return <span className={className}>{imagen}</span>
  }

  // El logo trae trazos morados que se pierden sobre el fondo morado del admin: se apoya
  // sobre una placa blanca para mantener el contraste, tal como en el brandbook.
  return (
    <span className={`inline-flex items-center rounded-lg bg-white px-2 py-1 shadow-sm ${className ?? ''}`}>
      {imagen}
    </span>
  )
}
