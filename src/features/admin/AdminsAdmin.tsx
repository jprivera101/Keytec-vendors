import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { obtenerAdmins } from '../../lib/api'
import { supabase } from '../../lib/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { IconVendedores } from '../../components/icons'
import { NOMBRE_PAIS } from './AdminLayout'
import type { CountryCode } from '../../lib/types'

export function AdminsAdmin({ mostrarEncabezado = true }: { mostrarEncabezado?: boolean }) {
  const queryClient = useQueryClient()
  const adminsQuery = useQuery({ queryKey: ['admins'], queryFn: obtenerAdmins })
  const [modalCrear, setModalCrear] = useState(false)

  return (
    <div className="space-y-4">
      {mostrarEncabezado ? (
        <PageHeader
          icon={<IconVendedores />}
          color="brand"
          title="Admins"
          subtitle="Un admin ve y gestiona solo su propio país."
          action={
            <button type="button" onClick={() => setModalCrear(true)} className="btn-primary">
              + Admin
            </button>
          }
        />
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={() => setModalCrear(true)} className="btn-primary">
            + Admin
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {adminsQuery.isLoading && <Spinner />}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {adminsQuery.data?.map((admin) => (
              <tr key={admin.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{admin.full_name}</td>
                <td className="px-4 py-3 text-slate-500">
                  {admin.country ? NOMBRE_PAIS[admin.country] : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{admin.phone || '—'}</td>
              </tr>
            ))}
            {adminsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                  No hay admins de país registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal titulo="Nuevo admin de país" abierto={modalCrear} onCerrar={() => setModalCrear(false)}>
        <FormularioCrearAdmin
          onCreado={() => {
            queryClient.invalidateQueries({ queryKey: ['admins'] })
          }}
        />
      </Modal>
    </div>
  )
}

function FormularioCrearAdmin({ onCreado }: { onCreado: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    if (!country) {
      setError('Selecciona el país')
      return
    }
    setError(null)
    setExito(null)
    setEnviando(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { email, password, full_name: fullName, phone: phone || undefined, country },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setExito(`Admin "${fullName}" creado. Comparte con él su correo y contraseña.`)
      setFullName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setCountry('')
      onCreado()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">País que administrará</label>
        <select
          required
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          className="input-field"
        >
          <option value="" disabled>
            Selecciona un país
          </option>
          {(Object.keys(NOMBRE_PAIS) as CountryCode[]).map((codigo) => (
            <option key={codigo} value={codigo}>
              {NOMBRE_PAIS[codigo]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña temporal</label>
        <input
          type="text"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {exito && <p className="text-sm text-green-700">{exito}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="btn-primary w-full py-2.5"
      >
        {enviando ? 'Creando...' : 'Crear admin'}
      </button>
    </form>
  )
}
