import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/useAuth'
import { Logo } from '../../components/Logo'
import { PoweredByPenthouse } from '../../components/PoweredByPenthouse'

/** Pantalla obligatoria (bloquea el resto de la app) cuando la contraseña actual es
 * temporal — recien creada por un admin o recien restablecida. El usuario elige su propia
 * contraseña una sola vez; despues de eso queda como su contraseña normal hasta el
 * siguiente restablecimiento. */
export function DefinirPassword() {
  const { profile, refrescarPerfil, cerrarSesion } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError

      const { error: perfilError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', profile!.id)
      if (perfilError) throw perfilError

      await refrescarPerfil()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={48} />
          <p className="text-center text-sm text-slate-500">
            Por seguridad, define tu propia contraseña para continuar.
          </p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nueva contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-base"
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirmar contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="input-field text-base"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={enviando} className="btn-primary w-full py-2.5">
            {enviando ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>

        <button
          type="button"
          onClick={cerrarSesion}
          className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          Cerrar sesión
        </button>
      </div>

      <PoweredByPenthouse className="mt-6" />
    </div>
  )
}
