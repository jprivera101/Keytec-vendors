import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { obtenerReporteVendedor } from '../../lib/api'
import { fechaLocalISO, fechaDesdeISO } from '../../lib/fechas'
import type { Week } from '../../lib/types'

const DIAS_RANGO_POR_DEFECTO = 6 // últimos 7 días (hoy - 6) al abrir el modal.

/** Modal para elegir un rango de fechas y descargar el reporte PDF de un vendedor. Las fechas
 * están acotadas a cuándo ese vendedor en verdad tiene semanas registradas -- no tiene sentido
 * dejar elegir un día antes de su primera ruta o uno futuro. */
export function GenerarReporteModal({
  vendedorId,
  vendedorNombre,
  semanas,
  abierto,
  onCerrar,
}: {
  vendedorId: string
  vendedorNombre: string
  semanas: Week[]
  abierto: boolean
  onCerrar: () => void
}) {
  const hoy = fechaLocalISO()
  const minFecha = semanas.length > 0 ? semanas.reduce((m, s) => (s.start_date < m ? s.start_date : m), semanas[0].start_date) : hoy

  const hoyFecha = fechaDesdeISO(hoy)
  const hace7dias = fechaLocalISO(new Date(hoyFecha.getFullYear(), hoyFecha.getMonth(), hoyFecha.getDate() - DIAS_RANGO_POR_DEFECTO))
  const desdePorDefecto = minFecha > hace7dias ? minFecha : hace7dias

  const [desde, setDesde] = useState(desdePorDefecto)
  const [hasta, setHasta] = useState(hoy)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generar() {
    setGenerando(true)
    setError(null)
    try {
      // jsPDF + jspdf-autotable son pesados (~140kB gzip) y solo los usa un admin generando un
      // reporte de vez en cuando -- un import() dinámico los deja en su propio chunk en vez de
      // sumarse al bundle principal que descarga TODO el mundo (incluyendo cada vendedor en
      // campo) en cada carga de la app.
      const [reporte, { generarReportePdf }] = await Promise.all([
        obtenerReporteVendedor(vendedorId, desde, hasta),
        import('../../lib/reportePdf'),
      ])
      await generarReportePdf(reporte)
      onCerrar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Modal titulo={`Reporte de ${vendedorNombre}`} abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Elige el rango de fechas del reporte.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Desde</label>
            <input
              type="date"
              value={desde}
              min={minFecha}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="input-field text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Hasta</label>
            <input
              type="date"
              value={hasta}
              min={desde}
              max={hoy}
              onChange={(e) => setHasta(e.target.value)}
              className="input-field text-base"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="button" onClick={generar} disabled={generando} className="btn-primary w-full py-2.5">
          {generando ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>
    </Modal>
  )
}
