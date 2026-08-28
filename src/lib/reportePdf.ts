import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMonto } from './currency'
import type { ReporteVendedor, RutaReporte } from './types'

const ACENTO: [number, number, number] = [56, 46, 136] // ink-700, mismo morado del logo/manifest
const TEXTO: [number, number, number] = [30, 41, 59] // slate-800
const TEXTO_SUAVE: [number, number, number] = [100, 116, 139] // slate-500
const LINEA: [number, number, number] = [226, 232, 240] // slate-200
const CANCELADA: [number, number, number] = [185, 28, 28] // red-700

const MARGEN = 16
const ALTO_MAXIMO = 277 // A4 (297mm) menos margen inferior, para decidir el salto de página

function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

/** jspdf-autotable no expone `lastAutoTable` en sus tipos públicos pero sí lo asigna en
 * tiempo de ejecución (ver dist/jspdf.plugin.autotable.js) -- de ahí el cast. */
function finalYDeLaTabla(doc: jsPDF, y: number): number {
  const conTabla = doc as unknown as { lastAutoTable?: { finalY?: number } }
  return conTabla.lastAutoTable?.finalY ?? y
}

function dibujarTablaVentas(
  doc: jsPDF,
  y: number,
  filas: RutaReporte['ventasDetalle'],
  country: ReporteVendedor['country'],
  color: [number, number, number],
): number {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Tienda', 'Fecha', 'Monto']],
    body: filas.map((v) => [v.tienda, formatearFecha(v.fecha), formatMonto(v.monto, country)]),
    theme: 'plain',
    styles: { fontSize: 9, textColor: color, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 0 } },
    headStyles: { textColor: TEXTO_SUAVE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 2: { halign: 'right' } },
    tableLineColor: LINEA,
    tableLineWidth: 0,
  })
  return finalYDeLaTabla(doc, y) + 4
}

/** Arma un PDF limpio y minimalista con el detalle de ventas de un vendedor en un rango de
 * fechas, y dispara la descarga. Una sección por ruta (semana) que se traslape con el rango;
 * si una ruta empezó antes del rango elegido se avisa con una nota, porque solo se cuentan los
 * días dentro del rango, no la ruta completa. Las ventas canceladas se listan aparte y nunca
 * suman al total. */
export function generarReportePdf(reporte: ReporteVendedor): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...ACENTO)
  doc.text('Reporte de ventas', MARGEN, y)
  y += 8

  doc.setDrawColor(...LINEA)
  doc.setLineWidth(0.3)
  doc.line(MARGEN, y, anchoPagina - MARGEN, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...TEXTO)
  doc.text(`Vendedor: ${reporte.vendedorNombre}`, MARGEN, y)
  y += 6
  doc.text(`Período: ${formatearFecha(reporte.desde)} – ${formatearFecha(reporte.hasta)}`, MARGEN, y)
  y += 6
  doc.text(`Rutas en el período: ${reporte.totalRutas}`, MARGEN, y)
  y += 7

  const totalVendidoGeneral = reporte.rutas.reduce((suma, r) => suma + r.totalVendido, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Total vendido: ${formatMonto(totalVendidoGeneral, reporte.country)}`, MARGEN, y)
  y += 10

  if (reporte.rutas.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...TEXTO_SUAVE)
    doc.text('No hay rutas registradas en este período.', MARGEN, y)
  }

  for (const ruta of reporte.rutas) {
    if (y > ALTO_MAXIMO - 20) {
      doc.addPage()
      y = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...ACENTO)
    doc.text(`Ruta iniciada el ${formatearFecha(ruta.fechaInicioReal)}`, MARGEN, y)
    y += 5

    if (ruta.comenzoAntesDelRango) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(...TEXTO_SUAVE)
      const nota = `Nota: esta ruta comenzó antes del período seleccionado (${formatearFecha(ruta.fechaInicioReal)}); aquí solo se cuentan los días dentro del rango.`
      doc.text(nota, MARGEN, y, { maxWidth: anchoPagina - MARGEN * 2 })
      y += 8
    }

    if (!ruta.fechaFinReal) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(...TEXTO_SUAVE)
      doc.text('Ruta activa (todavía no finaliza).', MARGEN, y)
      y += 6
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXTO)
    doc.text(
      `Visitas: ${ruta.visitas}     Ventas: ${ruta.ventas}     Total: ${formatMonto(ruta.totalVendido, reporte.country)}`,
      MARGEN,
      y,
    )
    y += 5

    if (ruta.ventasDetalle.length > 0) {
      y = dibujarTablaVentas(doc, y, ruta.ventasDetalle, reporte.country, TEXTO)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXTO_SUAVE)
      doc.text('Sin ventas en este período.', MARGEN, y)
      y += 7
    }

    if (ruta.ventasCanceladas.length > 0) {
      if (y > ALTO_MAXIMO - 20) {
        doc.addPage()
        y = 20
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...CANCELADA)
      doc.text('Ventas canceladas en este período (no incluidas en el total):', MARGEN, y)
      y += 4
      y = dibujarTablaVentas(doc, y, ruta.ventasCanceladas, reporte.country, CANCELADA)
    }

    y += 3
    doc.setDrawColor(...LINEA)
    doc.line(MARGEN, y, anchoPagina - MARGEN, y)
    y += 8
  }

  const nombreVendedor = reporte.vendedorNombre.trim().toLowerCase().replace(/\s+/g, '-')
  doc.save(`reporte-${nombreVendedor}-${reporte.desde}_a_${reporte.hasta}.pdf`)
}
