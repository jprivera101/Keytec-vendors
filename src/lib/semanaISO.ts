/** Helpers para el selector nativo <input type="week"> (formato "AAAA-Www"), usado en la
 * vista de Depósitos del admin para elegir una semana calendario (lunes a domingo) que aplica
 * a todos los vendedores a la vez. */

export function semanaISOActual(): string {
  const hoy = new Date()
  const diaISO = (hoy.getDay() + 6) % 7 // 0 = lunes .. 6 = domingo
  const jueves = new Date(hoy)
  jueves.setDate(hoy.getDate() - diaISO + 3)
  const primerJueves = new Date(jueves.getFullYear(), 0, 4)
  const diaPrimerJueves = (primerJueves.getDay() + 6) % 7
  primerJueves.setDate(primerJueves.getDate() - diaPrimerJueves + 3)
  const numero = 1 + Math.round((jueves.getTime() - primerJueves.getTime()) / (7 * 86400000))
  return `${jueves.getFullYear()}-W${String(numero).padStart(2, '0')}`
}

export function rangoDesdeSemanaISO(valor: string): {
  desde: string
  hasta: string
  desdeFecha: Date
  hastaFecha: Date
} {
  const [anioStr, semanaStr] = valor.split('-W')
  const anio = Number(anioStr)
  const semana = Number(semanaStr)
  const cuatroDeEnero = new Date(anio, 0, 4)
  const diaCuatro = (cuatroDeEnero.getDay() + 6) % 7
  const lunesSemana1 = new Date(cuatroDeEnero)
  lunesSemana1.setDate(cuatroDeEnero.getDate() - diaCuatro)
  const desdeFecha = new Date(lunesSemana1)
  desdeFecha.setDate(lunesSemana1.getDate() + (semana - 1) * 7)
  const hastaFecha = new Date(desdeFecha)
  hastaFecha.setDate(desdeFecha.getDate() + 7)
  return {
    desde: desdeFecha.toISOString(),
    hasta: hastaFecha.toISOString(),
    desdeFecha,
    hastaFecha,
  }
}
