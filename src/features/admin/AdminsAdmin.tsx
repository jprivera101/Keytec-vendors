import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { obtenerAdmins, establecerVendedorActivo } from '../../lib/api'
import { supabase } from '../../lib/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { ModalRestablecerPassword } from '../../components/ModalRestablecerPassword'
import { PageHeader } from '../../components/PageHeader'
import { IconVendedores } from '../../components/icons'
import { NOMBRE_PAIS } from './AdminLayout'
import type { CountryCode, Profile } from '../../lib/types'

export function AdminsAdmin({ mostrarEncabezado = true }: { mostrarEncabezado?: boolean }) {
  const queryClient = useQueryClient()
  const adminsQuery = useQuery({ queryKey: ['admins'], queryFn: obtenerAdmins })
  const [modalCrear, setModalCrear] = useState(false)
  const [adminPassword, setAdminPassword] = useState<Profile | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ['admins'] })
  }

  async function alternarActivo(admin: Profile) {
    setError(null)
    setCambiandoEstado(admin.id)
    try {
      await establecerVendedorActivo(admin.id, !admin.active)
      refrescar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCambiandoEstado(null)
    }
  }

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        {adminsQuery.isLoading && <Spinner />}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {adminsQuery.data?.map((admin) => (
              <tr key={admin.id} className={admin.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium text-slate-900">{admin.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{admin.username ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">
                  {admin.country ? NOMBRE_PAIS[admin.country] : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{admin.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      admin.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {admin.active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminPassword(admin)}
                      className="btn-secondary btn-sm"
                    >
                      Restablecer contraseña
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarActivo(admin)}
                      disabled={cambiandoEstado === admin.id}
                      className="btn-secondary btn-sm"
                    >
                      {cambiandoEstado === admin.id
                        ? 'Guardando...'
                        : admin.active
                          ? 'Desactivar'
                          : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {adminsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
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
            refrescar()
          }}
        />
      </Modal>

      <ModalRestablecerPassword usuario={adminPassword} onCerrar={() => setAdminPassword(null)} />
    </div>
  )
}

function FormularioCrearAdmin({ onCreado }: { onCreado: () => void }) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
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
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      setError('El usuario debe tener 3-32 caracteres: minúsculas, números, punto, guion o guion bajo')
      return
    }
    setError(null)
    setExito(null)
    setEnviando(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { email, password, full_name: fullName, username, phone: phone || undefined, country },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setExito(`Admin "${fullName}" creado. Comparte con él su usuario (${username}) y contraseña.`)
      setFullName('')
      setUsername('')
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
        <label className="mb-1 block text-sm font-medium text-slate-700">Usuario (para iniciar sesión)</label>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="Ej. jperez"
          className="input-field"
          autoCapitalize="none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Correo (opcional)</label>
        <input
          type="email"
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
