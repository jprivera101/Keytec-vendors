import { useState } from 'react'
import { FotoPrivada } from '../../components/FotoPrivada'
import { VisorFotoZoom } from '../../components/VisorFotoZoom'
import { descargarFoto } from '../../lib/storage'
import { fechaLocalISO } from '../../lib/fechas'
import type { Deposito } from '../../lib/types'

interface Props {
  deposito: Deposito
  vendedorNombre?: string
  /** Muestra un botón para descargar la foto directamente (p.ej. para el operario). */
  puedeDescargar?: boolean
}

const NOMBRE_ARCHIVO_INVALIDO = /[^a-z0-9-_]+/gi

/** Fila de un depósito: solo evidencia fotográfica (sin monto). `vendedorNombre` es para
 * vistas que mezclan depósitos de varios vendedores (p.ej. la del operario). */
export function DepositoCard({ deposito, vendedorNombre, puedeDescargar = false }: Props) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const fecha = new Date(deposito.created_at).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  async function manejarDescargar() {
    setDescargando(true)
    try {
      const nombre = deposito.label
        ? deposito.label.trim().replace(/\s+/g, '-').replace(NOMBRE_ARCHIVO_INVALIDO, '')
        : 'deposito'
      await descargarFoto('deposit-photos', deposito.photo_path, `${nombre}-${fechaLocalISO(deposito.created_at)}.jpg`)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="card flex items-center gap-3 p-3">
      <button type="button" onClick={() => setFotoAmpliada(true)} className="shrink-0">
        <FotoPrivada
          bucket="deposit-photos"
          path={deposito.photo_path}
          alt="Foto del depósito"
          className="h-12 w-12 rounded-lg object-cover"
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">💰 {deposito.label || 'Depósito'}</p>
        <p className="truncate text-xs text-slate-400">
          {vendedorNombre && <span className="font-medium text-slate-500">{vendedorNombre} · </span>}
          {fecha}
        </p>
      </div>

      {puedeDescargar && (
        <button
          type="button"
          onClick={manejarDescargar}
          disabled={descargando}
          className="btn-secondary btn-sm shrink-0"
        >
          {descargando ? 'Preparando...' : '⬇ Descargar'}
        </button>
      )}

      <VisorFotoZoom
        bucket="deposit-photos"
        path={deposito.photo_path}
        alt="Foto del depósito"
        abierto={fotoAmpliada}
        onCerrar={() => setFotoAmpliada(false)}
      />
    </div>
  )
}
