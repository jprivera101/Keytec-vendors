import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { Logo } from '../../components/Logo'
import { PoweredByPenthouse } from '../../components/PoweredByPenthouse'
import { IconDepositos, IconProcesar } from '../../components/icons'

const ENLACES = [
  { to: '/operario', etiqueta: 'Ventas por procesar', fin: true, Icono: IconProcesar },
  { to: '/operario/depositos', etiqueta: 'Depósitos', fin: false, Icono: IconDepositos },
]

export function OperarioLayout() {
  const { profile, cerrarSesion } = useAuth()

  if (!profile) return null

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col bg-slate-50 lg:max-w-5xl">
      <header className="flex items-center justify-between bg-ink-700 px-4 py-4 text-white shadow-sm lg:px-8">
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

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2">
        {ENLACES.map((enlace) => (
          <NavLink
            key={enlace.to}
            to={enlace.to}
            end={enlace.fin}
            className={({ isActive }) =>
              `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
              }`
            }
          >
            <enlace.Icono />
            {enlace.etiqueta}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 space-y-4 p-4 lg:p-8">
        <Outlet />
        <PoweredByPenthouse />
      </main>
    </div>
  )
}
