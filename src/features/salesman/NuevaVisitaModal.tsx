import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { obtenerUbicacion, type Coordenadas } from '../../lib/ubicacion'
import { obtenerLugaresPorPais, crearLugar } from '../../lib/lugares'
import { obtenerTiendasPorLugar, crearTienda, actualizarTienda } from '../../lib/tiendas'
import { crearVisita } from '../../lib/api'
import { SelectorLugarTienda, NUEVO_LUGAR, NUEVA_TIENDA } from './SelectorLugarTienda'
import type { CountryCode, Visit } from '../../lib/types'

interface Props {
  abierto: boolean
  weekId: string
  userId: string
  country: CountryCode
  onCerrar: () => void
  onCreada: (visita: Visit) => void
}

export function NuevaVisitaModal({ abierto, weekId, userId, country, onCerrar, onCreada }: Props) {
  const [archivo, setArchivo] = useState<Blob | null>(null)
  const [lugarId, setLugarId] = useState('')
  const [nuevoLugarNombre, setNuevoLugarNombre] = useState('')
  const [tiendaId, setTiendaId] = useState('')
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState('')
  // Datos del cliente: siempre para una tienda nueva; para una ya existente solo si todavía
  // no se le completaron (backfill). TEMPORAL: una vez que todas las tiendas activas ya
  // tengan client_name, se puede quitar el bloque "necesitaCompletarDatos" de este archivo.
  const [nombreTiendaEditado, setNombreTiendaEditado] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [notes, setNotes] = useState('')
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lugaresQuery = useQuery({
    queryKey: ['lugares', country],
    queryFn: () => obtenerLugaresPorPais(country),
    enabled: abierto,
  })

  const tiendasQuery = useQuery({
    queryKey: ['tiendas-lugar', lugarId],
    queryFn: () => obtenerTiendasPorLugar(lugarId),
    enabled: abierto && !!lugarId && lugarId !== NUEVO_LUGAR,
  })

  const creandoTiendaNueva = lugarId === NUEVO_LUGAR || tiendaId === NUEVA_TIENDA
  const tiendaSeleccionada = tiendasQuery.data?.find((t) => t.id === tiendaId)
  const necesitaCompletarDatos = !creandoTiendaNueva && !!tiendaSeleccionada && !tiendaSeleccionada.client_name

  function manejarTiendaIdChange(id: string) {
    setTiendaId(id)
    const tienda = tiendasQuery.data?.find((t) => t.id === id)
    setNombreTiendaEditado(tienda?.name ?? '')
    setClienteNombre(tienda?.client_name ?? '')
    setClienteTelefono(tienda?.phone ?? '')
  }

  useEffect(() => {
    if (abierto) {
      setArchivo(null)
      setLugarId('')
      setNuevoLugarNombre('')
      setTiendaId('')
      setNuevaTiendaNombre('')
      setNombreTiendaEditado('')
      setClienteNombre('')
      setClienteTelefono('')
      setNotes('')
      setUbicacion(null)
      setError(null)
      capturarUbicacion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  async function capturarUbicacion() {
    setBuscandoUbicacion(true)
    setErrorUbicacion(null)
    try {
      const coords = await obtenerUbicacion()
      setUbicacion(coords)
    } catch (e) {
      setErrorUbicacion((e as Error).message)
    } finally {
      setBuscandoUbicacion(false)
    }
  }

  async function manejarGuardar() {
    if (!archivo) {
      setError('Toma una foto de la tienda')
      return
    }
    if (!ubicacion) {
      setError('Necesitamos tu ubicación para registrar la visita')
      return
    }
    if (!lugarId) {
      setError('Selecciona el lugar que estás visitando')
      return
    }
    if (lugarId === NUEVO_LUGAR && !nuevoLugarNombre.trim()) {
      setError('Ingresa el nombre del nuevo lugar')
      return
    }
    if (lugarId !== NUEVO_LUGAR) {
      if (!tiendaId) {
        setError('Selecciona la tienda que estás visitando')
        return
      }
      if (tiendaId === NUEVA_TIENDA && !nuevaTiendaNombre.trim()) {
        setError('Ingresa el nombre de la nueva tienda')
        return
      }
    }
    if (creandoTiendaNueva && !clienteNombre.trim()) {
      setError('Ingresa el nombre del cliente')
      return
    }
    if (necesitaCompletarDatos) {
      if (!nombreTiendaEditado.trim()) {
        setError('Ingresa el nombre de la tienda')
        return
      }
      if (!clienteNombre.trim()) {
        setError('Ingresa el nombre del cliente')
        return
      }
    }

    setError(null)
    setEnviando(true)
    try {
      // La foto se sube primero: si la tienda es nueva, esta misma foto (la de su primera
      // visita) queda guardada de forma permanente como la foto de la tienda.
      const comprimida = await comprimirImagen(archivo)
      const path = await subirFoto('visit-photos', userId, comprimida)

      let placeId = lugarId
      if (lugarId === NUEVO_LUGAR) {
        const nuevoLugar = await crearLugar({
          country,
          name: nuevoLugarNombre.trim(),
          created_by: userId,
        })
        placeId = nuevoLugar.id
      }

      let storeId: string
      let storeName: string
      if (creandoTiendaNueva) {
        const nuevaTienda = await crearTienda({
          place_id: placeId,
          country,
          name: nuevaTiendaNombre.trim(),
          client_name: clienteNombre.trim(),
          phone: clienteTelefono.trim() || null,
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          created_by: userId,
          photo_path: path,
        })
        storeId = nuevaTienda.id
        storeName = nuevaTienda.name
      } else if (necesitaCompletarDatos && tiendaSeleccionada) {
        const tiendaActualizada = await actualizarTienda(tiendaSeleccionada.id, {
          name: nombreTiendaEditado.trim(),
          client_name: clienteNombre.trim(),
          phone: clienteTelefono.trim() || null,
        })
        storeId = tiendaActualizada.id
        storeName = tiendaActualizada.name
      } else {
        const tienda = tiendasQuery.data?.find((t) => t.id === tiendaId)
        if (!tienda) throw new Error('Selecciona una tienda válida')
        storeId = tienda.id
        storeName = tienda.name
      }

      const visita = await crearVisita({
        week_id: weekId,
        store_id: storeId,
        store_name: storeName,
        notes: notes.trim() || null,
        photo_path: path,
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
      })
      onCreada(visita)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Nueva visita" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-4">
        <CamaraCaptura etiqueta="Foto de la tienda" onCapturada={setArchivo} />

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          {buscandoUbicacion && <p className="text-slate-500">Obteniendo ubicación...</p>}
          {ubicacion && !buscandoUbicacion && <p className="text-green-700">✓ Ubicación capturada</p>}
          {errorUbicacion && (
            <div>
              <p className="mb-2 text-red-600">{errorUbicacion}</p>
              <button
                type="button"
                onClick={capturarUbicacion}
                className="btn-secondary btn-sm"
              >
                Reintentar ubicación
              </button>
            </div>
          )}
        </div>

        <SelectorLugarTienda
          lugares={lugaresQuery.data ?? []}
          tiendas={tiendasQuery.data ?? []}
          lugarId={lugarId}
          nuevoLugarNombre={nuevoLugarNombre}
          tiendaId={tiendaId}
          nuevaTiendaNombre={nuevaTiendaNombre}
          onLugarIdChange={setLugarId}
          onNuevoLugarNombreChange={setNuevoLugarNombre}
          onTiendaIdChange={manejarTiendaIdChange}
          onNuevaTiendaNombreChange={setNuevaTiendaNombre}
        />

        {creandoTiendaNueva && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del cliente</label>
              <input
                type="text"
                required
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente o dueño"
                className="input-field text-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
              <input
                type="tel"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej. 5555-5555"
                className="input-field text-base"
              />
            </div>
          </div>
        )}

        {/* TEMPORAL: mientras se completan los datos de las tiendas ya existentes. Quitar
            este bloque (y "necesitaCompletarDatos" arriba) cuando ya no haga falta. */}
        {necesitaCompletarDatos && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700">
              A esta tienda todavía le falta el nombre del cliente. Complétalo para continuar.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la tienda</label>
              <input
                type="text"
                required
                value={nombreTiendaEditado}
                onChange={(e) => setNombreTiendaEditado(e.target.value)}
                className="input-field text-base"
              />
              <p className="mt-1 text-xs text-slate-500">
                Si aquí aparece el nombre del cliente en vez del de la tienda, corrígelo.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del cliente</label>
              <input
                type="text"
                required
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente o dueño"
                className="input-field text-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
              <input
                type="tel"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej. 5555-5555"
                className="input-field text-base"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input-field text-base"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={manejarGuardar}
          disabled={enviando}
          className="btn-primary w-full py-2.5"
        >
          {enviando ? 'Guardando...' : 'Guardar visita'}
        </button>
      </div>
    </Modal>
  )
}
