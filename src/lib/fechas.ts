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

/** Lunes local (00:00) de la semana calendario (lunes-domingo) que contiene `fecha`. */
export function lunesDeLaSemana(fecha: Date = new Date()): Date {
  const diasDesdeElLunes = (fecha.getDay() + 6) % 7
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - diasDesdeElLunes)
}

/** Limites [lunes 00:00, lunes siguiente 00:00) de la semana calendario que contiene `fecha`
 * -- para filtrar "toda la semana, lunes a domingo" sin depender de las semanas propias de
 * cada vendedor (que empiezan cuando el vendedor decide, no siempre un lunes). */
export function limitesSemanaCalendario(fecha: Date = new Date()): { desde: Date; hasta: Date } {
  const desde = lunesDeLaSemana(fecha)
  const hasta = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 7)
  return { desde, hasta }
}

/** Todos los lunes cuya semana (lunes-domingo) toca el mes dado -- para armar el selector de
 * "semana" de la vista de mapa por país sin atarse a las semanas propias de cada vendedor. */
export function semanasCalendarioDeMes(anio: number, mes: number): Date[] {
  const ultimoDiaMes = new Date(anio, mes + 1, 0)
  const lunes: Date[] = []
  let cursor = lunesDeLaSemana(new Date(anio, mes, 1))
  while (cursor <= ultimoDiaMes) {
    lunes.push(cursor)
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
  }
  return lunes
}

/** Mes actual en formato "AAAA-MM", para el valor por defecto de un <input type="month">. */
export function mesISOActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

/** Mes inmediatamente anterior al actual, en formato "AAAA-MM". */
export function mesISOAnterior(): string {
  const hoy = new Date()
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  return `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`
}

/** Límites [primer día del mes, primer día del mes siguiente) para el mes "AAAA-MM" dado. */
export function rangoDesdeMesISO(valor: string): {
  desde: string
  hasta: string
  desdeFecha: Date
  hastaFecha: Date
} {
  const [anioStr, mesStr] = valor.split('-')
  const anio = Number(anioStr)
  const mes = Number(mesStr) - 1
  const desdeFecha = new Date(anio, mes, 1)
  const hastaFecha = new Date(anio, mes + 1, 1)
  return { desde: desdeFecha.toISOString(), hasta: hastaFecha.toISOString(), desdeFecha, hastaFecha }
}
