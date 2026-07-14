import { useState } from 'react'
import { Modal } from './Modal'
import { restablecerPassword } from '../lib/api'

interface Props {
  usuario: { id: string; full_name: string } | null
  onCerrar: () => void
}

// Sin 0/O/1/l/I para que sea facil de leer/dictar en voz alta sin confundir caracteres.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generarPassword() {
  return Array.from({ length: 8 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
}

/** Modal reutilizable para restablecer la contraseña de cualquier cuenta (vendedor, admin de
 * país u operario). Al confirmar, cierra la sesión de esa persona en todos sus dispositivos —
 * Supabase revoca sus tokens automáticamente al cambiar la contraseña por la Admin API. */
export function ModalRestablecerPassword({ usuario, onCerrar }: Props) {
  const [password, setPassword] = useState(generarPassword)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  function cerrarYReiniciar() {
    setListo(false)
    setError(null)
    setPassword(generarPassword())
    onCerrar()
  }

  async function manejarEnvio() {
    if (!usuario) return
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await restablecerPassword(usuario.id, password)
      setListo(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Restablecer contraseña" abierto={!!usuario} onCerrar={cerrarYReiniciar}>
      {usuario &&
        (listo ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700">
              Contraseña de {usuario.full_name} actualizada. Se cerró su sesión en todos sus dispositivos.
            </p>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-400">Nueva contraseña</p>
              <p className="font-mono text-lg font-semibold tracking-wide text-slate-900">{password}</p>
            </div>
            <p className="text-xs text-slate-500">
              Compártela con {usuario.full_name} para que pueda volver a entrar.
            </p>
            <button type="button" onClick={cerrarYReiniciar} className="btn-primary w-full py-2.5">
              Listo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Vas a restablecer la contraseña de{' '}
              <span className="font-semibold text-slate-900">{usuario.full_name}</span>. Esto cerrará su
              sesión en todos los dispositivos donde haya iniciado sesión.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nueva contraseña</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="input-field flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setPassword(generarPassword())}
                  className="btn-secondary btn-sm shrink-0"
                >
                  Generar
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="button" onClick={manejarEnvio} disabled={enviando} className="btn-primary w-full py-2.5">
              {enviando ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </div>
        ))}
    </Modal>
  )
}
