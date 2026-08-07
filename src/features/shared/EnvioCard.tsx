import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FotoPrivada } from '../../components/FotoPrivada'
import { VisorFotoZoom } from '../../components/VisorFotoZoom'
import { Modal } from '../../components/Modal'
import { formatMonto } from '../../lib/currency'
import { useAuth } from '../../lib/useAuth'
import { editarMontoVentaEnvio, cancelarVentaEnvio } from '../../lib/api'
import type { CountryCode, VentaEnvio } from '../../lib/types'

interface Props {
  venta: VentaEnvio
  country?: CountryCode | null
  /** Admin/super_admin: puede corregir el monto o cancelar la venta (con motivo). */
  puedeGestionarVentas?: boolean
}

/** Fila de una venta por envío: sin tienda ni ubicación, solo a quién se le vendió + foto + monto. */
export function EnvioCard({ venta, country, puedeGestionarVentas = false }: Props) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const [editando, setEditando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const fecha = new Date(venta.created_at).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`card p-3 ${venta.cancelled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        {venta.photo_path ? (
          <button type="button" onClick={() => setFotoAmpliada(true)} className="shrink-0">
            <FotoPrivada
              bucket="sale-photos"
              path={venta.photo_path}
              alt="Foto de la venta"
              className="h-12 w-12 rounded-lg object-cover"
            />
          </button>
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
            Sin foto
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">📦 {venta.client_name}</p>
          <p className="text-xs text-slate-400">{fecha}</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-slate-900">{formatMonto(venta.amount, country)}</p>
      </div>

      {venta.cancelled ? (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          <p className="font-semibold">✕ Venta cancelada</p>
          <p className="mt-0.5">{venta.cancel_reason}</p>
        </div>
      ) : (
        puedeGestionarVentas && (
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Editar monto
            </button>
            <button
              type="button"
              onClick={() => setCancelando(true)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Cancelar venta
            </button>
          </div>
        )
      )}

      <VisorFotoZoom
        bucket="sale-photos"
        path={venta.photo_path}
        alt="Foto de la venta"
        abierto={fotoAmpliada}
        onCerrar={() => setFotoAmpliada(false)}
      />

      <EditarMontoEnvioModal venta={editando ? venta : null} onCerrar={() => setEditando(false)} />
      <CancelarVentaEnvioModal
        venta={cancelando ? venta : null}
        country={country}
        onCerrar={() => setCancelando(false)}
      />
    </div>
  )
}

function EditarMontoEnvioModal({ venta, onCerrar }: { venta: VentaEnvio | null; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMonto(venta ? String(venta.amount) : '')
    setError(null)
  }, [venta])

  async function guardar() {
    if (!venta) return
    const valor = Number(monto)
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setError(null)
    setGuardando(true)
    try {
      await editarMontoVentaEnvio(venta.id, valor)
      await queryClient.invalidateQueries({ queryKey: ['ventas-envio'] })
      onCerrar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Editar monto de la venta" abierto={!!venta} onCerrar={onCerrar}>
      <div className="space-y-3">
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="input-field text-base"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={guardar} disabled={guardando} className="btn-primary w-full py-2.5">
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

function CancelarVentaEnvioModal({
  venta,
  country,
  onCerrar,
}: {
  venta: VentaEnvio | null
  country?: CountryCode | null
  onCerrar: () => void
}) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMotivo('')
    setConfirmando(false)
    setError(null)
  }, [venta])

  async function confirmar() {
    if (!venta || !profile) return
    if (!motivo.trim()) {
      setError('Escribe el motivo de la cancelación')
      return
    }
    setError(null)
    setGuardando(true)
    try {
      await cancelarVentaEnvio(venta.id, motivo.trim(), profile.id)
      await queryClient.invalidateQueries({ queryKey: ['ventas-envio'] })
      cerrarTodo()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  function cerrarTodo() {
    setConfirmando(false)
    onCerrar()
  }

  return (
    <Modal titulo="Cancelar venta" abierto={!!venta} onCerrar={cerrarTodo}>
      {venta && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Vas a cancelar la venta de <strong>{formatMonto(Number(venta.amount), country)}</strong>. Esto la
            excluye de todos los totales, pero queda visible como cancelada para el historial.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motivo de la cancelación</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej. Venta duplicada"
              className="input-field text-base"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!confirmando ? (
            <button
              type="button"
              onClick={() => (motivo.trim() ? setConfirmando(true) : setError('Escribe el motivo de la cancelación'))}
              className="btn-primary w-full py-2.5"
            >
              Continuar
            </button>
          ) : (
            <div className="space-y-2 rounded-lg bg-amber-50 p-3">
              <p className="text-sm text-amber-700">¿Confirmas que quieres cancelar esta venta?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={guardando}
                  className="btn-secondary btn-sm flex-1"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={guardando}
                  className="btn-primary btn-sm flex-1"
                >
                  {guardando ? 'Cancelando...' : 'Sí, cancelar venta'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
