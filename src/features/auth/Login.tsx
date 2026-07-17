import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { resolverEmailDeUsername } from '../../lib/api'
import { Logo } from '../../components/Logo'
import { PoweredByPenthouse } from '../../components/PoweredByPenthouse'
import { RUTA_POR_ROL } from './RutaProtegida'

const ERROR_GENERICO = 'Usuario o contraseña incorrectos'

export function Login() {
  const { session, profile, cargando, authError, iniciarSesion } = useAuth()
  const [username, setUsername] = useState('')
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
    try {
      const email = await resolverEmailDeUsername(username.trim().toLowerCase())
      if (!email) {
        setError(ERROR_GENERICO)
        return
      }
      const { error } = await iniciarSesion(email, password)
      if (error) setError(ERROR_GENERICO)
    } catch {
      setError(ERROR_GENERICO)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={48} />
          <p className="text-sm text-slate-500">Ruta de Ventas · Inicia sesión con tu cuenta</p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Usuario</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field text-base"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
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

      <PoweredByPenthouse className="mt-6" />
    </div>
  )
}
