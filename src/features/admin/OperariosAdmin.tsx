import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  obtenerOperarios,
  obtenerAsignacionesDeOperario,
  establecerAsignaciones,
  type OperarioConAsignados,
} from '../../lib/operarios'
import { obtenerVendedores, establecerVendedorActivo } from '../../lib/api'
import { supabase } from '../../lib/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { ModalRestablecerPassword } from '../../components/ModalRestablecerPassword'
import { PageHeader } from '../../components/PageHeader'
import { IconProcesar } from '../../components/icons'
import { SelectorVendedoresMultiple } from '../../components/SelectorVendedoresMultiple'

export function OperariosAdmin({ mostrarEncabezado = true }: { mostrarEncabezado?: boolean }) {
  const queryClient = useQueryClient()
  const operariosQuery = useQuery({ queryKey: ['operarios'], queryFn: obtenerOperarios })
  const [modalCrear, setModalCrear] = useState(false)
  const [operarioEditar, setOperarioEditar] = useState<OperarioConAsignados | null>(null)
  const [operarioPassword, setOperarioPassword] = useState<OperarioConAsignados | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ['operarios'] })
  }

  async function alternarActivo(operario: OperarioConAsignados) {
    setError(null)
    setCambiandoEstado(operario.id)
    try {
      await establecerVendedorActivo(operario.id, !operario.active)
      refrescar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCambiandoEstado(null)
    }
  }

  const botonCrear = (
    <button type="button" onClick={() => setModalCrear(true)} className="btn-primary">
      + Operario
    </button>
  )

  return (
    <div className="space-y-4">
      {mostrarEncabezado ? (
        <PageHeader
          icon={<IconProcesar />}
          color="celeste"
          title="Operarios"
          subtitle="Revisan la foto de cada venta y la marcan como procesada en el CRM."
          action={botonCrear}
        />
      ) : (
        <div className="flex justify-end">{botonCrear}</div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        {operariosQuery.isLoading && <Spinner />}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Vendedores asignados</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operariosQuery.data?.map((operario) => (
              <tr key={operario.id} className={operario.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium text-slate-900">{operario.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{operario.username ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{operario.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-500">
                  {operario.asignados} vendedor{operario.asignados !== 1 && 'es'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      operario.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {operario.active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOperarioEditar(operario)}
                      className="btn-secondary btn-sm w-28"
                    >
                      Editar asignación
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperarioPassword(operario)}
                      className="btn-secondary btn-sm w-28"
                    >
                      Restablecer contraseña
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarActivo(operario)}
                      disabled={cambiandoEstado === operario.id}
                      className="btn-secondary btn-sm w-28"
                    >
                      {cambiandoEstado === operario.id
                        ? 'Guardando...'
                        : operario.active
                          ? 'Desactivar'
                          : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {operariosQuery.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                  No hay operarios registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal titulo="Nuevo operario" abierto={modalCrear} onCerrar={() => setModalCrear(false)}>
        <FormularioCrearOperario
          onCreado={() => {
            refrescar()
          }}
        />
      </Modal>

      {operarioEditar && (
        <ModalEditarAsignacion
          operario={operarioEditar}
          onCerrar={() => setOperarioEditar(null)}
          onGuardado={() => {
            setOperarioEditar(null)
            refrescar()
          }}
        />
      )}

      <ModalRestablecerPassword usuario={operarioPassword} onCerrar={() => setOperarioPassword(null)} />
    </div>
  )
}

function FormularioCrearOperario({ onCreado }: { onCreado: () => void }) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const vendedoresQuery = useQuery({ queryKey: ['vendedores', 'ALL'], queryFn: () => obtenerVendedores('ALL') })

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    if (seleccionados.length === 0) {
      setError('Selecciona al menos un vendedor para asignarle')
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
      const { data, error } = await supabase.functions.invoke('create-operario', {
        body: {
          password,
          full_name: fullName,
          username,
          phone: phone || undefined,
          salesman_ids: seleccionados,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setExito(`Operario "${fullName}" creado. Comparte con él su usuario (${username}) y contraseña.`)
      setFullName('')
      setUsername('')
      setPhone('')
      setPassword('')
      setSeleccionados([])
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
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
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
        <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
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
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Vendedores que va a procesar</label>
        <SelectorVendedoresMultiple
          vendedores={vendedoresQuery.data ?? []}
          seleccionados={seleccionados}
          onChange={setSeleccionados}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {exito && <p className="text-sm text-green-700">{exito}</p>}

      <button type="submit" disabled={enviando} className="btn-primary w-full py-2.5">
        {enviando ? 'Creando...' : 'Crear operario'}
      </button>
    </form>
  )
}

function ModalEditarAsignacion({
  operario,
  onCerrar,
  onGuardado,
}: {
  operario: OperarioConAsignados
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [seleccionados, setSeleccionados] = useState<string[] | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vendedoresQuery = useQuery({ queryKey: ['vendedores', 'ALL'], queryFn: () => obtenerVendedores('ALL') })
  const asignacionesQuery = useQuery({
    queryKey: ['asignaciones-operario', operario.id],
    queryFn: () => obtenerAsignacionesDeOperario(operario.id),
  })

  const valorActual = seleccionados ?? asignacionesQuery.data ?? []

  async function guardar() {
    if (valorActual.length === 0) {
      setError('Selecciona al menos un vendedor')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await establecerAsignaciones(operario.id, valorActual)
      onGuardado()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Vendedores de ${operario.full_name}`} abierto onCerrar={onCerrar}>
      <div className="space-y-4">
        {asignacionesQuery.isLoading ? (
          <Spinner />
        ) : (
          <SelectorVendedoresMultiple
            vendedores={vendedoresQuery.data ?? []}
            seleccionados={valorActual}
            onChange={setSeleccionados}
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={guardar} disabled={enviando} className="btn-primary w-full py-2.5">
          {enviando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Modal>
  )
}
