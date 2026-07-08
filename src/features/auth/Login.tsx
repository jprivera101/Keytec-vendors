import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { Logo } from '../../components/Logo'
import { RUTA_POR_ROL } from './RutaProtegida'

export function Login() {
  const { session, profile, cargando, authError, iniciarSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session && profile) {
    return <Navigate to={RUTA_POR_ROL[profile.role]} replace />
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error } = await iniciarSesion(email, password)
    setEnviando(false)
    if (error) setError(error)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={48} />
          <p className="text-sm text-slate-500">Ruta de Ventas · Inicia sesión con tu cuenta</p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field text-base"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-base"
              autoComplete="current-password"
            />
          </div>

          {(error || authError) && <p className="text-sm text-red-600">{error || authError}</p>}

          <button type="submit" disabled={enviando || cargando} className="btn-primary w-full py-2.5">
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
