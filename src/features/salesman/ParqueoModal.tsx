import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { obtenerUbicacion, type Coordenadas } from '../../lib/ubicacion'
import { crearParqueo, cerrarParqueo } from '../../lib/api'
import type { ParkingSpot } from '../../lib/types'

interface Props {
  abierto: boolean
  modo: 'abrir' | 'cerrar'
  weekId: string
  userId: string
  /** Requerido cuando modo es 'cerrar': el registro de parqueo que se está cerrando. */
  parqueoAbierto?: ParkingSpot | null
  onCerrar: () => void
  onListo: (parqueo: ParkingSpot) => void
}

/** Un solo modal para las dos puntas del parqueo: "abrir" captura GPS + foto del carro,
 * "cerrar" solo captura la foto del recibo (la ubicación ya quedó fija al abrir). */
export function ParqueoModal({ abierto, modo, weekId, userId, parqueoAbierto, onCerrar, onListo }: Props) {
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) {
      setError(null)
      setUbicacion(null)
      if (modo === 'abrir') capturarUbicacion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, modo])

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

  async function guardarAbrir(archivo: Blob) {
    if (!ubicacion) {
      setError('Necesitamos tu ubicación para marcar el parqueo')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(archivo)
      const path = await subirFoto('parking-photos', userId, comprimida)
      const parqueo = await crearParqueo({
        week_id: weekId,
        salesman_id: userId,
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        car_photo_path: path,
      })
      onListo(parqueo)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  async function guardarCerrar(archivo: Blob) {
    if (!parqueoAbierto) return
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(archivo)
      const path = await subirFoto('parking-photos', userId, comprimida)
      const parqueo = await cerrarParqueo(parqueoAbierto.id, path)
      onListo(parqueo)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={modo === 'abrir' ? '🅿️ Marcar parqueo' : '🚗 Salir del parqueo'}
      abierto={abierto}
      onCerrar={onCerrar}
    >
      <div className="space-y-4">
        {modo === 'abrir' && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            {buscandoUbicacion && <p className="text-slate-500">Obteniendo ubicación...</p>}
            {ubicacion && !buscandoUbicacion && <p className="text-green-700">✓ Ubicación capturada</p>}
            {errorUbicacion && (
              <div>
                <p className="mb-2 text-red-600">{errorUbicacion}</p>
                <button type="button" onClick={capturarUbicacion} className="btn-secondary btn-sm">
                  Reintentar ubicación
                </button>
              </div>
            )}
          </div>
        )}

        {enviando ? (
          <p className="text-center text-sm text-slate-500">Guardando...</p>
        ) : (
          <CamaraCaptura
            etiqueta={modo === 'abrir' ? 'Foto del carro parqueado' : 'Foto del recibo del parqueo'}
            onCapturada={modo === 'abrir' ? guardarAbrir : guardarCerrar}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
