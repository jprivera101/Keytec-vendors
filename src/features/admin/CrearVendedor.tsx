import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

export function CrearVendedor() {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setExito(null)
    setEnviando(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-salesman', {
        body: { email, password, full_name: fullName, phone: phone || undefined },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setExito(`Vendedor "${fullName}" creado. Comparte con él su correo y contraseña.`)
      setFullName('')
      setEmail('')
      setPhone('')
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['vendedores'] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto min-h-full max-w-md bg-slate-50 pb-10">
      <header className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <Link to="/admin" className="text-brand-700">
          ← Volver
        </Link>
        <h1 className="font-semibold text-slate-900">Crear vendedor</h1>
      </header>

      <main className="p-4">
        <form onSubmit={manejarEnvio} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña temporal</label>
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">Compártela con el vendedor para su primer inicio de sesión.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {exito && <p className="text-sm text-green-700">{exito}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {enviando ? 'Creando...' : 'Crear vendedor'}
          </button>
        </form>
      </main>
    </div>
  )
}
