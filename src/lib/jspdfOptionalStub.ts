// jsPDF lazy-imports html2canvas/dompurify/canvg only inside doc.html() and
// doc.addSvgAsImage(), which this app never calls (reportePdf.ts only uses text/line/
// autoTable). Without this alias (see vite.config.ts), those three libraries still get
// bundled as separate chunks and the PWA's generateSW glob precaches them for every user
// on every service-worker update -- ~800KB of dead code nobody's session ever runs.
export default {}
