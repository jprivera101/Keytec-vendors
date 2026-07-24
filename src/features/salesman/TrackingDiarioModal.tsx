import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { fechaLocalISO } from '../../lib/fechas'
import { crearTrackingDiario, cerrarTrackingDiario } from '../../lib/api'
import type { DailyTracking } from '../../lib/types'

interface Props {
  abierto: boolean
  modo: 'empezar' | 'terminar'
  weekId: string
  userId: string
  /** Requerido cuando modo es 'terminar': el registro del día que se está cerrando. */
  trackingAbierto?: DailyTracking | null
  onCerrar: () => void
  onListo: (tracking: DailyTracking) => void
}

type Paso = 'foto' | 'km'

/** Un solo modal para las dos puntas del día: "empezar" pide foto del carro + km inicial,
 * "terminar" pide foto del carro + km final. Foto primero (como en gasolina/envío) para no
 * arriesgar tener que repetirla si el km todavía no es válido. */
export function TrackingDiarioModal({
  abierto,
  modo,
  weekId,
  userId,
  trackingAbierto,
  onCerrar,
  onListo,
}: Props) {
  const [paso, setPaso] = useState<Paso>('foto')
  const [archivo, setArchivo] = useState<Blob | null>(null)
  const [km, setKm] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) {
      setPaso('foto')
      setArchivo(null)
      setKm('')
      setError(null)
    }
  }, [abierto])

  function manejarFotoCapturada(foto: Blob) {
    setArchivo(foto)
    setPaso('km')
  }

  async function guardar() {
    if (!archivo) return
    const valor = Number(km)
    if (!km || Number.isNaN(valor) || valor < 0) {
      setError(`Ingresa el kilometraje ${modo === 'empezar' ? 'inicial' : 'final'}`)
      return
    }
    if (modo === 'terminar' && trackingAbierto && valor < trackingAbierto.start_km) {
      setError(`El km final no puede ser menor al inicial (${trackingAbierto.start_km})`)
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(archivo)
      const path = await subirFoto('daily-tracking-photos', userId, comprimida)
      const tracking =
        modo === 'empezar'
          ? await crearTrackingDiario({
              week_id: weekId,
              salesman_id: userId,
              tracking_date: fechaLocalISO(),
              start_km: valor,
              start_photo_path: path,
            })
          : await cerrarTrackingDiario(trackingAbierto!.id, valor, path)
      onListo(tracking)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={modo === 'empezar' ? '🚗 Empezar día' : '🏁 Terminar día'}
      abierto={abierto}
      onCerrar={onCerrar}
    >
      <div className="space-y-4">
        {paso === 'foto' && <CamaraCaptura etiqueta="Foto del carro" onCapturada={manejarFotoCapturada} />}

        {paso === 'km' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Kilometraje {modo === 'empezar' ? 'inicial' : 'final'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="Ej. 12345.6"
                className="input-field text-base"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="button" onClick={guardar} disabled={enviando} className="btn-primary w-full py-2.5">
              {enviando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
