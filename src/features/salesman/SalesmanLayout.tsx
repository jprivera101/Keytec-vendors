import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { Logo } from '../../components/Logo'
import { PoweredByPenthouse } from '../../components/PoweredByPenthouse'
import { IconHistorial, IconInicio, IconRuta } from '../../components/icons'

const TABS = [
  { to: '/vendedor', etiqueta: 'Inicio', Icono: IconInicio, fin: true },
  { to: '/vendedor/ruta', etiqueta: 'Mi ruta', Icono: IconRuta, fin: false },
  { to: '/vendedor/historial', etiqueta: 'Historial', Icono: IconHistorial, fin: false },
]

export function SalesmanLayout() {
  const { profile, cerrarSesion } = useAuth()

  if (!profile) return null

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-slate-50">
      <header className="flex items-center justify-between bg-ink-700 px-4 py-4 text-white shadow-sm">
        <div className="flex items-center gap-2.5">
          <Logo variant="icon" light size={30} />
          <div className="leading-tight">
            <p className="text-xs text-white/70">Hola,</p>
            <p className="font-semibold">{profile.full_name}</p>
          </div>
        </div>
        <button onClick={cerrarSesion} className="text-sm font-medium text-white/70 hover:text-white">
          Salir
        </button>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-24">
        <Outlet />
        <PoweredByPenthouse />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.fin}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-brand-700' : 'text-slate-400'
                }`
              }
            >
              <tab.Icono width={20} height={20} />
              {tab.etiqueta}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
