import type { CountryCode } from './types'

/** Guatemala vende en Quetzales, El Salvador en Dólares — cada monto se muestra en la
 * moneda del país al que pertenece esa venta/vendedor/tienda, nunca mezclado. */
export const SIMBOLO_MONEDA: Record<CountryCode, string> = {
  GT: 'Q',
  SV: '$',
}

export const CODIGO_MONEDA: Record<CountryCode, string> = {
  GT: 'GTQ',
  SV: 'USD',
}

export function formatMonto(amount: number, country?: CountryCode | null): string {
  const simbolo = country ? SIMBOLO_MONEDA[country] : 'Q'
  const numero = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${simbolo}${numero}`
}
