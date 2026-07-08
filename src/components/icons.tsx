// Iconos de línea minimalistas para la navegación del admin. Sin librería externa: trazos
// simples a 1.8px, heredan el color de texto (currentColor) para adaptarse a cualquier fondo.
import type { SVGProps } from 'react'

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={18}
      height={18}
      aria-hidden="true"
      {...props}
    />
  )
}

export function IconResumen(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </Base>
  )
}

export function IconVendedores(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M4.5 20c1-4.2 4-6.3 7.5-6.3s6.5 2.1 7.5 6.3" />
    </Base>
  )
}

export function IconTiendas(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 10 4.8 5.3a1 1 0 0 1 .98-.8h12.44a1 1 0 0 1 .98.8L20 10" />
      <path d="M4 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5 10v8.3a.7.7 0 0 0 .7.7H10v-4.3h4V19h4.3a.7.7 0 0 0 .7-.7V10" />
    </Base>
  )
}

export function IconAnalitica(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 15.5 9 10l3.5 3.5L20 6" />
      <path d="M14.5 6H20v5.5" />
    </Base>
  )
}

export function IconRoles(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3.2 18.5 6v5.2c0 4.6-2.9 7.7-6.5 9-3.6-1.3-6.5-4.4-6.5-9V6L12 3.2z" />
      <path d="m9.3 12 1.9 1.9 3.5-3.9" />
    </Base>
  )
}

export function IconGlobo(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.3 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.3-3.8-8.5S9.5 5.8 12 3.5z" />
    </Base>
  )
}

export function IconChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  )
}

export function IconRuta(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M8.1 6.9C11 8 13 10.5 13.5 13.5c.4 2.3 2 3.7 4 4" />
    </Base>
  )
}

export function IconInicio(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.3a.7.7 0 0 0 .7.7H10v-5h4v5h3.3a.7.7 0 0 0 .7-.7V10" />
    </Base>
  )
}

export function IconHistorial(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </Base>
  )
}

export function IconProcesar(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3v2.2h6V3M8.5 11.5l2 2 4.5-4.5M8.5 16.5h7" />
    </Base>
  )
}

export function IconBandera(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 3v18" />
      <path d="M5 4.5c2.2-1.3 4-1.3 6.2 0s4 1.3 6.2 0v8.4c-2.2 1.3-4 1.3-6.2 0s-4-1.3-6.2 0z" />
    </Base>
  )
}
