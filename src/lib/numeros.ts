/** Formatea un número con separador de miles (1,234.5), igual que formatMonto pero sin
 * símbolo de moneda — para kilometraje y otros conteos que se muestran en la UI. */
export function formatNumero(valor: number): string {
  return valor.toLocaleString('en-US', { maximumFractionDigits: 1 })
}
