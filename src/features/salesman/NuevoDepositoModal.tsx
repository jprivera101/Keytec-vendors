import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { CamaraCaptura } from '../../components/CamaraCaptura'
import { comprimirImagen } from '../../lib/imageCompress'
import { subirFoto } from '../../lib/storage'
import { crearDeposito } from '../../lib/api'
import type { Deposito } from '../../lib/types'

interface Props {
  abierto: boolean
  userId: string
  onCerrar: () => void
  onCreado: (deposito: Deposito) => void
}

type Paso = 'nombre' | 'foto' | 'confirmar'

const PASOS: Paso[] = ['nombre', 'foto', 'confirmar']

export function NuevoDepositoModal({ abierto, userId, onCerrar, onCreado }: Props) {
  const [paso, setPaso] = useState<Paso>('nombre')
  const [nombre, setNombre] = useState('')
  const [foto, setFoto] = useState<Blob | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) {
      setPaso('nombre')
      setNombre('')
      setFoto(null)
      setFotoUrl(null)
      setError(null)
    }
  }, [abierto])

  function continuarConNombre() {
    if (!nombre.trim()) {
      setError('Escribe qué días cubre este depósito')
      return
    }
    setError(null)
    setPaso(foto ? 'confirmar' : 'foto')
  }

  function manejarFotoCapturada(archivo: Blob) {
    setFoto(archivo)
    setFotoUrl(URL.createObjectURL(archivo))
    setPaso('confirmar')
  }

  async function guardar() {
    if (!foto) return
    setError(null)
    setEnviando(true)
    try {
      const comprimida = await comprimirImagen(foto)
      const path = await subirFoto('deposit-photos', userId, comprimida)
      const deposito = await crearDeposito(userId, path, nombre.trim())
      onCreado(deposito)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const indicePaso = PASOS.indexOf(paso) + 1

  return (
    <Modal titulo="💰 Registrar depósito" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Paso {indicePaso} de {PASOS.length}
        </p>

        {paso === 'nombre' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ¿Qué días de venta cubre este depósito?
              </label>
              <p className="mb-2 text-xs text-slate-400">
                Escribe los días, por ejemplo: "Lunes a miércoles"
              </p>
              <input
                type="text"
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Lunes a miércoles"
                className="input-field text-base"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="button" onClick={continuarConNombre} className="btn-primary w-full py-2.5">
              Continuar
            </button>
          </div>
        )}

        {paso === 'foto' && <CamaraCaptura etiqueta="📸 Foto del depósito" onCapturada={manejarFotoCapturada} />}

        {paso === 'confirmar' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Nombre del depósito</p>
              <p className="text-base font-semibold text-slate-900">{nombre}</p>
            </div>

            {fotoUrl && (
              <img src={fotoUrl} alt="Foto del depósito" className="max-h-64 w-full rounded-lg object-contain" />
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaso('nombre')}
                disabled={enviando}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Corregir nombre
              </button>
              <button type="button" onClick={guardar} disabled={enviando} className="btn-primary flex-1 py-2.5">
                {enviando ? 'Guardando...' : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
