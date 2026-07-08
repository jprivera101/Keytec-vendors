import { Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { Logo } from '../../components/Logo'

export function OperarioLayout() {
  const { profile, cerrarSesion } = useAuth()

  if (!profile) return null

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col bg-slate-50">
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

      <main className="flex-1 space-y-4 p-4">
        <Outlet />
      </main>
    </div>
  )
}
