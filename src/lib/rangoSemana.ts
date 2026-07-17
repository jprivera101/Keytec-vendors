import { fechaLocalISO } from './fechas'
import type { Week } from './types'

/** Rango de fechas [desde, hasta) de una semana de ruta, usado para filtrar registros que no
 * están ligados a "weeks" (p.ej. depósitos) pero que se quieren mostrar agrupados por semana. */
export function rangoDeSemana(semana: Week): { desde: string; hasta: string } {
  const desde = `${semana.start_date}T00:00:00`
  const hastaFecha = semana.end_date ?? fechaLocalISO()
  const hasta = `${hastaFecha}T23:59:59`
  return { desde, hasta }
}
