import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CapturaFoto } from '../../components/CapturaFoto'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { obtenerUbicacion, type Coordenadas } from '../../lib/ubicacion'
import { crearVisita } from '../../lib/api'
import type { Visit } from '../../lib/types'

interface Props {
  abierto: boolean
  weekId: string
  userId: string
  onCerrar: () => void
  onCreada: (visita: Visit) => void
}

export function NuevaVisitaModal({ abierto, weekId, userId, onCerrar, onCreada }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [storeName, setStoreName] = useState('')
  const [notes, setNotes] = useState('')
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) {
      setArchivo(null)
      setStoreName('')
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
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(archivo)
      const path = await subirFoto('visit-photos', userId, comprimida)
      const visita = await crearVisita({
        week_id: weekId,
        store_name: storeName.trim() || null,
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
        <CapturaFoto etiqueta="Foto de la tienda" onArchivo={setArchivo} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nombre de la tienda (opcional)
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          {buscandoUbicacion && <p className="text-slate-500">Obteniendo ubicación...</p>}
          {ubicacion && !buscandoUbicacion && (
            <p className="text-green-700">
              ✓ Ubicación capturada ({ubicacion.latitude.toFixed(5)}, {ubicacion.longitude.toFixed(5)})
            </p>
          )}
          {errorUbicacion && (
            <div>
              <p className="mb-2 text-red-600">{errorUbicacion}</p>
              <button
                type="button"
                onClick={capturarUbicacion}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
              >
                Reintentar ubicación
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={manejarGuardar}
          disabled={enviando}
          className="w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {enviando ? 'Guardando...' : 'Guardar visita'}
        </button>
      </div>
    </Modal>
  )
}
