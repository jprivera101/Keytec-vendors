import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { actualizarVendedor, establecerVendedorActivo, obtenerVendedores } from '../../lib/api'
import { obtenerOperariosPorVendedor } from '../../lib/operarios'
import { obtenerRegionesPorPais, crearRegion } from '../../lib/regiones'
import { Spinner } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { ModalRestablecerPassword } from '../../components/ModalRestablecerPassword'
import { PageHeader } from '../../components/PageHeader'
import { IconVendedores } from '../../components/icons'
import { FormularioCrearVendedor } from './CrearVendedor'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode, VendedorConRegion } from '../../lib/types'

export function VendedoresAdmin({ mostrarEncabezado = true }: { mostrarEncabezado?: boolean }) {
  const { pais, region, profile } = useOutletContext<AdminOutletContext>()
  const queryClient = useQueryClient()
  const vendedoresQuery = useQuery({
    queryKey: ['vendedores', pais, region],
    queryFn: () => obtenerVendedores(pais, region),
  })
  const operariosPorVendedorQuery = useQuery({
    queryKey: ['operarios-por-vendedor'],
    queryFn: obtenerOperariosPorVendedor,
  })

  const [modalCrear, setModalCrear] = useState(false)
  const [vendedorEditar, setVendedorEditar] = useState<VendedorConRegion | null>(null)
  const [vendedorPassword, setVendedorPassword] = useState<VendedorConRegion | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ['vendedores'] })
  }

  const esSuperAdmin = profile.role === 'super_admin'

  async function alternarActivo(vendedor: VendedorConRegion) {
    setError(null)
    setCambiandoEstado(vendedor.id)
    try {
      await establecerVendedorActivo(vendedor.id, !vendedor.active)
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
          title="Vendedores"
          subtitle="Administra las cuentas del equipo de ventas."
          action={
            <button type="button" onClick={() => setModalCrear(true)} className="btn-primary">
              + Vendedor
            </button>
          }
        />
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={() => setModalCrear(true)} className="btn-primary">
            + Vendedor
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        {vendedoresQuery.isLoading && <Spinner />}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              {pais === 'ALL' && <th className="px-4 py-3 font-medium">País</th>}
              <th className="px-4 py-3 font-medium">Región</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Operario</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ruta</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendedoresQuery.data?.map((vendedor) => (
              <tr key={vendedor.id} className={vendedor.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/admin/analitica/${vendedor.id}`} className="hover:text-brand-700">
                    {vendedor.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{vendedor.username ?? '—'}</td>
                {pais === 'ALL' && (
                  <td className="px-4 py-3 text-slate-500">
                    {vendedor.country ? NOMBRE_PAIS[vendedor.country] : '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-slate-500">{vendedor.region_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{vendedor.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-500">
                  {operariosPorVendedorQuery.data?.get(vendedor.id)?.join(', ') ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      vendedor.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {vendedor.active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/admin/analitica/${vendedor.id}`} className="text-brand-700 hover:underline">
                    Ver rutas →
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-stretch justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setVendedorEditar(vendedor)}
                      className="btn-secondary btn-sm w-28"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setVendedorPassword(vendedor)}
                      className="btn-secondary btn-sm w-28"
                    >
                      Restablecer contraseña
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarActivo(vendedor)}
                      disabled={cambiandoEstado === vendedor.id}
                      className="btn-secondary btn-sm w-28"
                    >
                      {cambiandoEstado === vendedor.id
                        ? 'Guardando...'
                        : vendedor.active
                          ? 'Desactivar'
                          : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {vendedoresQuery.data?.length === 0 && (
              <tr>
                <td colSpan={pais === 'ALL' ? 9 : 8} className="px-4 py-6 text-center text-sm text-slate-400">
                  No hay vendedores registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal titulo="Nuevo vendedor" abierto={modalCrear} onCerrar={() => setModalCrear(false)}>
        <FormularioCrearVendedor
          mostrarSelectorPais={esSuperAdmin}
          paisPredeterminado={esSuperAdmin ? (pais !== 'ALL' ? pais : undefined) : (profile.country as CountryCode)}
          onCreado={() => {
            refrescar()
          }}
        />
      </Modal>

      {vendedorEditar && (
        <ModalEditarVendedor
          vendedor={vendedorEditar}
          onCerrar={() => setVendedorEditar(null)}
          onGuardado={() => {
            setVendedorEditar(null)
            refrescar()
          }}
        />
      )}

      <ModalRestablecerPassword usuario={vendedorPassword} onCerrar={() => setVendedorPassword(null)} />
    </div>
  )
}

const NUEVA_REGION_EDIT = '__nueva_region_edit__'

function ModalEditarVendedor({
  vendedor,
  onCerrar,
  onGuardado,
}: {
  vendedor: VendedorConRegion
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [fullName, setFullName] = useState(vendedor.full_name)
  const [phone, setPhone] = useState(vendedor.phone ?? '')
  const [kmPerGallon, setKmPerGallon] = useState(vendedor.km_per_gallon?.toString() ?? '')
  const [parkingEnabled, setParkingEnabled] = useState(vendedor.parking_enabled)
  const [regionId, setRegionId] = useState(vendedor.route_id ?? '')
  const [nuevaRegionNombre, setNuevaRegionNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const regionesQuery = useQuery({
    queryKey: ['regiones', vendedor.country],
    queryFn: () => obtenerRegionesPorPais(vendedor.country as CountryCode),
    enabled: !!vendedor.country,
  })

  async function guardar() {
    if (!fullName.trim()) {
      setError('El nombre no puede estar vacío')
      return
    }
    if (!regionId) {
      setError('Selecciona la región')
      return
    }
    if (regionId === NUEVA_REGION_EDIT && !nuevaRegionNombre.trim()) {
      setError('Ingresa el nombre de la nueva región')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      let finalRegionId = regionId
      if (regionId === NUEVA_REGION_EDIT) {
        const nuevaRegion = await crearRegion({
          country: vendedor.country as CountryCode,
          name: nuevaRegionNombre.trim(),
        })
        finalRegionId = nuevaRegion.id
      }
      await actualizarVendedor(vendedor.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        route_id: finalRegionId,
        km_per_gallon: kmPerGallon ? Number(kmPerGallon) : null,
        parking_enabled: parkingEnabled,
      })
      onGuardado()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Editar vendedor" abierto onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Usuario (para iniciar sesión)</label>
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
            {vendedor.username ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">El usuario no se puede cambiar una vez asignado.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rendimiento (km por galón)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={kmPerGallon}
            onChange={(e) => setKmPerGallon(e.target.value)}
            placeholder="Ej. 35"
            className="input-field"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={parkingEnabled}
            onChange={(e) => setParkingEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600/40"
          />
          Puede usar la función de parqueo
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Región</label>
          <select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value)
              setNuevaRegionNombre('')
            }}
            className="input-field"
          >
            <option value="" disabled>
              Selecciona una región
            </option>
            {regionesQuery.data?.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
            <option value={NUEVA_REGION_EDIT}>+ Nueva región</option>
          </select>
          {regionId === NUEVA_REGION_EDIT && (
            <input
              type="text"
              autoFocus
              placeholder="Nombre de la nueva región"
              value={nuevaRegionNombre}
              onChange={(e) => setNuevaRegionNombre(e.target.value)}
              className="input-field mt-2"
            />
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={guardar}
          disabled={enviando}
          className="btn-primary w-full py-2.5"
        >
          {enviando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Modal>
  )
}
