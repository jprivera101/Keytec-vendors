import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/useAuth.tsx'

// registerType: 'autoUpdate' en vite.config.ts no hace nada por si solo -- el script que
// vite-plugin-pwa inyecta automaticamente solo registra el service worker una vez al
// cargar, sin revisar si hay una version nueva. Sin esto, una pestaña o el PWA instalado
// puede quedarse corriendo el bundle viejo indefinidamente hasta que alguien lo cierre del
// todo y lo vuelva a abrir -- lo que se reportaba como "no veo los cambios".
registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
