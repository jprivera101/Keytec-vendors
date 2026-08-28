import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const jspdfOptionalStub = fileURLToPath(new URL('./src/lib/jspdfOptionalStub.ts', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // jsPDF only needs these for doc.html()/addSvgAsImage(), which this app never calls --
      // see src/lib/jspdfOptionalStub.ts for why this alias exists.
      html2canvas: jspdfOptionalStub,
      dompurify: jspdfOptionalStub,
      canvg: jspdfOptionalStub,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Ruta de Ventas',
        short_name: 'Ruta Ventas',
        description: 'Seguimiento de rutas, visitas y ventas de vendedores en campo',
        theme_color: '#382e88',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // El chunk de reportePdf (jsPDF + jspdf-autotable, ~140kB gzip) solo lo usa un admin
        // generando un reporte de vez en cuando -- se carga dinámicamente (ver
        // GenerarReporteModal) para no sumarse al bundle principal, y por lo mismo no tiene
        // sentido precachearlo para TODOS los usuarios (incluyendo cada vendedor en campo) en
        // cada actualización del service worker. El navegador lo cachea normalmente por HTTP
        // la primera vez que un admin abre el modal de reporte.
        globIgnores: ['**/reportePdf-*.js'],
      },
    }),
  ],
})
