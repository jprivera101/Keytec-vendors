import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMonto } from './currency'
import type { ReporteVendedor, RutaReporte } from './types'

// Misma paleta de la app (ver src/index.css) para que el PDF se sienta parte de la marca,
// no un volcado de texto plano.
const INK: [number, number, number] = [56, 46, 136] // ink-700
const INK_CLARO: [number, number, number] = [238, 236, 249] // ink-50
const HIGHLIGHT: [number, number, number] = [255, 206, 7] // highlight-400
const TEXTO: [number, number, number] = [30, 41, 59] // slate-800
const TEXTO_SUAVE: [number, number, number] = [100, 116, 139] // slate-500
const LINEA: [number, number, number] = [226, 232, 240] // slate-200
const FONDO_TARJETA: [number, number, number] = [248, 250, 252] // slate-50
const CANCELADA: [number, number, number] = [185, 28, 28] // red-700
const CANCELADA_FONDO: [number, number, number] = [254, 242, 242] // red-50

const MARGEN = 14
const ALTO_MAXIMO = 280 // A4 (297mm) menos margen inferior, para decidir el salto de página
const ALTO_ENCABEZADO = 30

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

/** El logo es opcional a propósito: si por lo que sea no carga (offline, ruta distinta en
 * otro despliegue), el reporte se genera igual, solo que sin el isotipo en el encabezado. */
async function cargarLogo(): Promise<{ dataUrl: string; ancho: number; alto: number } | null> {
  try {
    const respuesta = await fetch('/logo-keytec.png')
    if (!respuesta.ok) return null
    const blob = await respuesta.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader()
      lector.onload = () => resolve(lector.result as string)
      lector.onerror = () => reject(lector.error)
      lector.readAsDataURL(blob)
    })
    const { ancho, alto } = await new Promise<{ ancho: number; alto: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
      img.onerror = () => reject(new Error('No se pudo leer el logo'))
      img.src = dataUrl
    })
    return { dataUrl, ancho, alto }
  } catch {
    return null
  }
}

function saltoDePagina(doc: jsPDF, y: number, minimoRestante = 24): number {
  if (y <= ALTO_MAXIMO - minimoRestante) return y
  doc.addPage()
  return 20
}

function dibujarTarjeta(
  doc: jsPDF,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  etiqueta: string,
  valor: string,
  destacar = false,
) {
  doc.setFillColor(...FONDO_TARJETA)
  doc.setDrawColor(...LINEA)
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, ancho, alto, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXTO_SUAVE)
  doc.text(etiqueta.toUpperCase(), x + 4, y + 6.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(destacar ? 13 : 10.5)
  doc.setTextColor(...(destacar ? INK : TEXTO))
  doc.text(valor, x + 4, y + (destacar ? 15.5 : 14), { maxWidth: ancho - 8 })
}

/** Fila de tarjetas de resumen (Período/Rutas/Visitas/Total, o la variante de portada del
 * consolidado). Repartidas a partes iguales sobre el ancho de contenido. */
function dibujarFilaDeTarjetas(doc: jsPDF, y: number, anchoContenido: number, tarjetas: [string, string, boolean?][]): number {
  const espacioEntreTarjetas = 4
  const anchoTarjeta = (anchoContenido - espacioEntreTarjetas * (tarjetas.length - 1)) / tarjetas.length
  const altoTarjeta = 19
  tarjetas.forEach(([etiqueta, valor, destacar], i) => {
    dibujarTarjeta(doc, MARGEN + i * (anchoTarjeta + espacioEntreTarjetas), y, anchoTarjeta, altoTarjeta, etiqueta, valor, destacar)
  })
  return y + altoTarjeta + 10
}

function dibujarTablaVentas(
  doc: jsPDF,
  y: number,
  filas: RutaReporte['ventasDetalle'],
  country: ReporteVendedor['country'],
  variante: 'normal' | 'cancelada',
): number {
  const anchoPagina = doc.internal.pageSize.getWidth()
  const esCancelada = variante === 'cancelada'
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Tienda', 'Fecha', 'Monto']],
    body: filas.map((v) => [v.tienda, formatearFecha(v.fecha), formatMonto(v.monto, country)]),
    theme: 'striped',
    styles: { fontSize: 9, textColor: TEXTO, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
    headStyles: {
      fillColor: esCancelada ? CANCELADA_FONDO : INK,
      textColor: esCancelada ? CANCELADA : [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: esCancelada ? CANCELADA_FONDO : FONDO_TARJETA },
    columnStyles: { 1: { cellWidth: 28 }, 2: { cellWidth: 30, halign: 'right' } },
    tableWidth: anchoPagina - MARGEN * 2,
    tableLineColor: LINEA,
    tableLineWidth: 0.1,
  })
  return finalYDeLaTabla(doc, y) + 6
}

function dibujarPie(doc: jsPDF) {
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()
  const totalPaginas = doc.getNumberOfPages()
  const generadoEl = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINEA)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, altoPagina - 14, anchoPagina - MARGEN, altoPagina - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXTO_SUAVE)
    doc.text('KeyTec · Ruta de Ventas', MARGEN, altoPagina - 9)
    doc.text(`Generado el ${generadoEl}`, anchoPagina / 2, altoPagina - 9, { align: 'center' })
    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - MARGEN, altoPagina - 9, { align: 'right' })
  }
}

/** Encabezado con marca (banda morada + logo + franja amarilla) compartido por el reporte
 * individual y el consolidado -- lo único que cambia entre ambos es el título/subtítulo. */
function dibujarEncabezadoMarca(
  doc: jsPDF,
  logo: { dataUrl: string; ancho: number; alto: number } | null,
  titulo: string,
  subtitulo: string,
): number {
  const anchoPagina = doc.internal.pageSize.getWidth()
  doc.setFillColor(...INK)
  doc.rect(0, 0, anchoPagina, ALTO_ENCABEZADO, 'F')
  doc.setFillColor(...HIGHLIGHT)
  doc.rect(0, ALTO_ENCABEZADO, anchoPagina, 1.5, 'F')

  let xTitulo = MARGEN
  if (logo) {
    const altoLogo = 13
    const anchoLogo = altoLogo * (logo.ancho / logo.alto)
    const yLogo = (ALTO_ENCABEZADO - altoLogo - 6) / 2
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(MARGEN, yLogo, anchoLogo + 6, altoLogo + 6, 1.5, 1.5, 'F')
    doc.addImage(logo.dataUrl, 'PNG', MARGEN + 3, yLogo + 3, anchoLogo, altoLogo)
    xTitulo = MARGEN + anchoLogo + 12
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(titulo, xTitulo, ALTO_ENCABEZADO / 2 - 1)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(226, 232, 240)
  doc.text(subtitulo, xTitulo, ALTO_ENCABEZADO / 2 + 6)

  return ALTO_ENCABEZADO + 12
}

/** Una sección por ruta (semana) que se traslape con el rango del reporte: barra con la fecha
 * de inicio real (+ "ACTIVA" si sigue en curso), disclaimer si empezó antes del rango, línea
 * de estadísticas, tabla de ventas y, si las hay, tabla de canceladas aparte. Compartida por el
 * reporte individual y cada bloque de vendedor dentro del consolidado. */
function dibujarRutasDeVendedor(doc: jsPDF, y: number, rutas: RutaReporte[], country: ReporteVendedor['country']): number {
  const anchoPagina = doc.internal.pageSize.getWidth()
  const anchoContenido = anchoPagina - MARGEN * 2
  let yActual = y

  if (rutas.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...TEXTO_SUAVE)
    doc.text('No hay rutas registradas en este período.', MARGEN, yActual)
    return yActual + 8
  }

  for (const ruta of rutas) {
    yActual = saltoDePagina(doc, yActual, 30)

    // Barra de encabezado de la ruta, con la etiqueta "Activa" si sigue en curso.
    doc.setFillColor(...INK_CLARO)
    doc.rect(MARGEN, yActual, anchoContenido, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...INK)
    doc.text(`Ruta iniciada el ${formatearFecha(ruta.fechaInicioReal)}`, MARGEN + 3, yActual + 6.2)
    if (!ruta.fechaFinReal) {
      const etiquetaActiva = 'ACTIVA'
      doc.setFontSize(7.5)
      const anchoEtiqueta = doc.getTextWidth(etiquetaActiva) + 6
      doc.setFillColor(...HIGHLIGHT)
      doc.roundedRect(MARGEN + anchoContenido - anchoEtiqueta - 3, yActual + 2, anchoEtiqueta, 5, 1, 1, 'F')
      doc.setTextColor(...INK)
      doc.setFont('helvetica', 'bold')
      doc.text(etiquetaActiva, MARGEN + anchoContenido - anchoEtiqueta - 3 + anchoEtiqueta / 2, yActual + 5.4, {
        align: 'center',
      })
    }
    yActual += 12

    if (ruta.comenzoAntesDelRango) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...TEXTO_SUAVE)
      const nota = `Nota: esta ruta comenzó antes del período seleccionado (${formatearFecha(ruta.fechaInicioReal)}); aquí solo se cuentan los días dentro del rango.`
      doc.text(nota, MARGEN + 2, yActual, { maxWidth: anchoContenido - 4 })
      yActual += 7
    }

    // Línea de estadísticas: etiqueta gris pequeña arriba, valor en negrita abajo.
    const estadisticas: [string, string][] = [
      ['Visitas', String(ruta.visitas)],
      ['Ventas', String(ruta.ventas)],
      ['Total', formatMonto(ruta.totalVendido, country)],
    ]
    const anchoEstadistica = 34
    estadisticas.forEach(([etiqueta, valor], i) => {
      const x = MARGEN + 2 + i * anchoEstadistica
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...TEXTO_SUAVE)
      doc.text(etiqueta.toUpperCase(), x, yActual)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...TEXTO)
      doc.text(valor, x, yActual + 5)
    })
    yActual += 11

    if (ruta.ventasDetalle.length > 0) {
      yActual = dibujarTablaVentas(doc, yActual, ruta.ventasDetalle, country, 'normal')
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...TEXTO_SUAVE)
      doc.text('Sin ventas en este período.', MARGEN + 2, yActual)
      yActual += 9
    }

    if (ruta.ventasCanceladas.length > 0) {
      yActual = saltoDePagina(doc, yActual, 30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...CANCELADA)
      doc.text('Ventas canceladas en este período (no incluidas en el total)', MARGEN + 2, yActual)
      yActual += 4
      yActual = dibujarTablaVentas(doc, yActual, ruta.ventasCanceladas, country, 'cancelada')
    }

    yActual += 4
  }

  return yActual
}

function nombreDeArchivo(prefijo: string, desde: string, hasta: string): string {
  return `${prefijo}-${desde}_a_${hasta}.pdf`
}

/** Arma un PDF con marca (encabezado morado, logo, tarjetas de resumen y tablas con estilo)
 * del detalle de ventas de un vendedor en un rango de fechas, y dispara la descarga. Una
 * sección por ruta (semana) que se traslape con el rango; si una ruta empezó antes del rango
 * elegido se avisa con una nota, porque solo se cuentan los días dentro del rango, no la ruta
 * completa. Las ventas canceladas se listan aparte y nunca suman al total. */
export async function generarReportePdf(reporte: ReporteVendedor): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const anchoContenido = anchoPagina - MARGEN * 2

  const logo = await cargarLogo()
  let y = dibujarEncabezadoMarca(doc, logo, 'Reporte de ventas', reporte.vendedorNombre)

  const totalVendidoGeneral = reporte.rutas.reduce((suma, r) => suma + r.totalVendido, 0)
  const totalVisitas = reporte.rutas.reduce((suma, r) => suma + r.visitas, 0)
  y = dibujarFilaDeTarjetas(doc, y, anchoContenido, [
    ['Período', `${formatearFecha(reporte.desde)} – ${formatearFecha(reporte.hasta)}`],
    ['Rutas', String(reporte.totalRutas)],
    ['Visitas', String(totalVisitas)],
    ['Total vendido', formatMonto(totalVendidoGeneral, reporte.country), true],
  ])

  dibujarRutasDeVendedor(doc, y, reporte.rutas, reporte.country)
  dibujarPie(doc)

  const nombreVendedor = reporte.vendedorNombre.trim().toLowerCase().replace(/\s+/g, '-')
  doc.save(nombreDeArchivo(`reporte-${nombreVendedor}`, reporte.desde, reporte.hasta))
}

/** Reporte consolidado de varios vendedores en un solo PDF, para country managers que quieren
 * ver a todo su equipo de un jalón: portada con tarjetas de resumen + una tabla comparativa
 * (vendedor/rutas/visitas/total), y después el mismo desglose por ruta que el reporte
 * individual, uno por vendedor, cada uno empezando en página nueva. */
export async function generarReporteConsolidadoPdf(
  reportes: ReporteVendedor[],
  opciones: { etiquetaAlcance: string; desde: string; hasta: string },
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const anchoContenido = anchoPagina - MARGEN * 2
  const paisComun = reportes.find((r) => r.country != null)?.country ?? null

  const logo = await cargarLogo()
  let y = dibujarEncabezadoMarca(doc, logo, 'Reporte consolidado de ventas', opciones.etiquetaAlcance)

  const totalVendidoGeneral = reportes.reduce(
    (suma, r) => suma + r.rutas.reduce((s, ruta) => s + ruta.totalVendido, 0),
    0,
  )
  const totalRutas = reportes.reduce((suma, r) => suma + r.totalRutas, 0)
  y = dibujarFilaDeTarjetas(doc, y, anchoContenido, [
    ['Período', `${formatearFecha(opciones.desde)} – ${formatearFecha(opciones.hasta)}`],
    ['Vendedores', String(reportes.length)],
    ['Rutas', String(totalRutas)],
    ['Total vendido', formatMonto(totalVendidoGeneral, paisComun), true],
  ])

  // Tabla comparativa: un vistazo rápido de todo el equipo antes del detalle por vendedor.
  const filasComparativa = reportes
    .map((r) => ({
      nombre: r.vendedorNombre,
      rutas: r.totalRutas,
      visitas: r.rutas.reduce((s, ruta) => s + ruta.visitas, 0),
      total: r.rutas.reduce((s, ruta) => s + ruta.totalVendido, 0),
      country: r.country,
    }))
    .sort((a, b) => b.total - a.total)

  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Vendedor', 'Rutas', 'Visitas', 'Total vendido']],
    body: filasComparativa.map((f) => [f.nombre, String(f.rutas), String(f.visitas), formatMonto(f.total, f.country)]),
    theme: 'striped',
    styles: { fontSize: 9, textColor: TEXTO, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: FONDO_TARJETA },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    tableWidth: anchoContenido,
    tableLineColor: LINEA,
    tableLineWidth: 0.1,
  })
  y = finalYDeLaTabla(doc, y) + 10

  // Detalle por vendedor, cada uno en página nueva para que sea fácil imprimir/compartir uno
  // en particular.
  for (const reporte of reportes) {
    doc.addPage()
    y = 20
    doc.setFillColor(...INK_CLARO)
    doc.rect(MARGEN, y, anchoContenido, 11, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(reporte.vendedorNombre, MARGEN + 3, y + 7.5)
    y += 16

    dibujarRutasDeVendedor(doc, y, reporte.rutas, reporte.country)
  }

  dibujarPie(doc)
  doc.save(nombreDeArchivo('reporte-consolidado', opciones.desde, opciones.hasta))
}
