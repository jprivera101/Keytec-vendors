/** Fecha calendario LOCAL (no UTC) en formato YYYY-MM-DD, a partir de un timestamp ISO o de
 * "ahora". Existe para evitar el error de tomar solo los primeros 10 caracteres de un ISO en
 * UTC (`iso.slice(0, 10)`): en Guatemala/El Salvador (UTC-6) eso da la fecha de MAÑANA desde
 * las 6pm hasta medianoche hora local, aunque toda la UI (VisitaCard, etc.) ya muestre la
 * hora correcta vía toLocaleString. */
export function fechaLocalISO(fecha: Date | string = new Date()): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const anio = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}
