import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { crearGasolina } from '../../lib/api'
import { SIMBOLO_MONEDA } from '../../lib/currency'
import type { CountryCode, GasolinaRegistro } from '../../lib/types'

interface Props {
  abierto: boolean
  weekId: string
  userId: string
  country?: CountryCode | null
  onCerrar: () => void
  onCreada: (registro: GasolinaRegistro) => void
}

type Paso = 'inicial' | 'final' | 'factura' | 'monto'

const PASOS: Paso[] = ['inicial', 'final', 'factura', 'monto']

export function NuevaGasolinaModal({ abierto, weekId, userId, country, onCerrar, onCreada }: Props) {
  const [paso, setPaso] = useState<Paso>('inicial')
  const [fotoInicial, setFotoInicial] = useState<Blob | null>(null)
  const [fotoFinal, setFotoFinal] = useState<Blob | null>(null)
  const [fotoFactura, setFotoFactura] = useState<Blob | null>(null)
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const simbolo = country ? SIMBOLO_MONEDA[country] : 'Q'

  useEffect(() => {
    if (abierto) {
      setPaso('inicial')
      setFotoInicial(null)
      setFotoFinal(null)
      setFotoFactura(null)
      setMonto('')
      setError(null)
    }
  }, [abierto])

  async function guardar() {
    const valor = Number(monto)
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!fotoInicial || !fotoFinal || !fotoFactura) {
      setError('Faltan una o más fotos')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const [inicialComprimida, finalComprimida, facturaComprimida] = await Promise.all([
        comprimirImagen(fotoInicial),
        comprimirImagen(fotoFinal),
        comprimirImagen(fotoFactura),
      ])
      const [initialPath, finalPath, receiptPath] = await Promise.all([
        subirFoto('gasoline-photos', userId, inicialComprimida),
        subirFoto('gasoline-photos', userId, finalComprimida),
        subirFoto('gasoline-photos', userId, facturaComprimida),
      ])
      const registro = await crearGasolina({
        week_id: weekId,
        initial_tank_photo_path: initialPath,
        final_tank_photo_path: finalPath,
        receipt_photo_path: receiptPath,
        amount: valor,
      })
      onCreada(registro)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const indicePaso = PASOS.indexOf(paso) + 1

  return (
    <Modal titulo="⛽ Registrar gasolina" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Paso {indicePaso} de {PASOS.length}
        </p>

        {paso === 'inicial' && (
          <CamaraCaptura
            etiqueta="⛽ Foto del tanque ANTES de cargar"
            onCapturada={(archivo) => {
              setFotoInicial(archivo)
              setPaso('final')
            }}
          />
        )}

        {paso === 'final' && (
          <CamaraCaptura
            etiqueta="⛽ Foto del tanque DESPUÉS de cargar"
            onCapturada={(archivo) => {
              setFotoFinal(archivo)
              setPaso('factura')
            }}
          />
        )}

        {paso === 'factura' && (
          <CamaraCaptura
            etiqueta="🧾 Foto de la factura"
            onCapturada={(archivo) => {
              setFotoFactura(archivo)
              setPaso('monto')
            }}
          />
        )}

        {paso === 'monto' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                💵 Monto pagado ({simbolo})
              </label>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej. 250.00"
                className="input-field text-base"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="button" onClick={guardar} disabled={enviando} className="btn-primary w-full py-2.5">
              {enviando ? 'Guardando...' : '⛽ Guardar carga de gasolina'}
            </button>
          </div>
        )}

        {error && paso !== 'monto' && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
