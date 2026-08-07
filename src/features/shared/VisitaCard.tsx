import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FotoPrivada } from '../../components/FotoPrivada'
import { VisorFotoZoom } from '../../components/VisorFotoZoom'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { formatMonto } from '../../lib/currency'
import { useAuth } from '../../lib/useAuth'
import { editarMontoVenta, cancelarVenta } from '../../lib/api'
import type { CountryCode, Sale, VisitWithSales } from '../../lib/types'

interface Props {
  visita: VisitWithSales
  onAgregarVenta: (visitId: string) => void
  puedeAgregarVenta: boolean
  /** Determina si los montos se muestran en Quetzales o en Dólares. */
  country?: CountryCode | null
  /** Admin/super_admin: puede corregir el monto o cancelar una venta (con motivo). */
  puedeGestionarVentas?: boolean
}

/** Fila compacta por defecto (foto miniatura + nombre + monto); el detalle completo de cada
 * venta (fotos, fecha, monto) solo aparece al presionar "Detalles", para no abrumar de una
 * vez a alguien que solo quiere ver rapido que se vendio. */
export function VisitaCard({
  visita,
  onAgregarVenta,
  puedeAgregarVenta,
  country,
  puedeGestionarVentas = false,
}: Props) {
  const [expandido, setExpandido] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [fotoVisitaAmpliada, setFotoVisitaAmpliada] = useState(false)
  const [ventaEditando, setVentaEditando] = useState<Sale | null>(null)
  const [ventaCancelando, setVentaCancelando] = useState<Sale | null>(null)
  const ventasActivas = visita.sales.filter((v) => !v.cancelled)
  const totalVenta = ventasActivas.reduce((suma, v) => suma + Number(v.amount), 0)
  // Si esta visita puntual no tiene foto propia (tienda ya existente + foto de visita
  // desactivada), se muestra la foto permanente de la tienda en su lugar.
  const fotoVisita = visita.photo_path ?? visita.store_photo_path ?? null
  const fechaHoraVisita = new Date(visita.captured_at).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
      >
        <FotoPrivada
          bucket="visit-photos"
          path={fotoVisita}
          alt="Foto tomada en la visita a la tienda"
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{visita.store_name || 'Tienda sin nombre'}</p>
          <p className="text-xs text-slate-400">{fechaHoraVisita}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900">{formatMonto(totalVenta, country)}</p>
          <p className="text-xs text-slate-400">
            {ventasActivas.length} venta{ventasActivas.length !== 1 && 's'}
          </p>
        </div>
        <IconChevron
          className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {expandido && (
        <div className="border-t border-slate-100 p-3">
          {visita.notes && (
            <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-400">Nota: </span>
              {visita.notes}
            </p>
          )}

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Foto de la visita
          </p>
          <button type="button" onClick={() => setFotoVisitaAmpliada(true)} className="mb-3 block w-full">
            <FotoPrivada
              bucket="visit-photos"
              path={fotoVisita}
              alt="Foto tomada en la visita a la tienda"
              className="h-40 w-full rounded-lg object-cover"
            />
            <span className="mt-1 block text-center text-[10px] font-medium text-brand-700">Ver foto</span>
          </button>

          {visita.sales.length > 0 && (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Detalle de las ventas
              </p>
              <ul className="divide-y divide-slate-100">
                {visita.sales.map((venta) => (
                  <li key={venta.id} className={`py-2.5 text-sm ${venta.cancelled ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      {venta.photo_path ? (
                        <button
                          type="button"
                          onClick={() => setFotoAmpliada(venta.photo_path)}
                          className="flex shrink-0 flex-col items-center gap-0.5"
                        >
                          <FotoPrivada
                            bucket="sale-photos"
                            path={venta.photo_path}
                            alt="Foto de lo que se vendió"
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <span className="text-[10px] font-medium text-brand-700">Ver foto</span>
                        </button>
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
                          Sin foto
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="text-[11px] text-slate-400">Fecha de la venta</p>
                        <p className="text-slate-700">
                          {new Date(venta.created_at).toLocaleString('es-GT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">Monto vendido</p>
                        <p className="font-semibold text-slate-900">{formatMonto(Number(venta.amount), country)}</p>
                      </div>
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
                            onClick={() => setVentaEditando(venta)}
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            Editar monto
                          </button>
                          <button
                            type="button"
                            onClick={() => setVentaCancelando(venta)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Cancelar venta
                          </button>
                        </div>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {puedeAgregarVenta && (
        <button
          type="button"
          onClick={() => onAgregarVenta(visita.id)}
          className="w-full border-t border-slate-100 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          + Agregar venta
        </button>
      )}

      <VisorFotoZoom
        bucket="sale-photos"
        path={fotoAmpliada}
        alt="Foto de lo que se vendió"
        abierto={!!fotoAmpliada}
        onCerrar={() => setFotoAmpliada(null)}
      />

      <VisorFotoZoom
        bucket="visit-photos"
        path={fotoVisita}
        alt="Foto tomada en la visita a la tienda"
        abierto={fotoVisitaAmpliada}
        onCerrar={() => setFotoVisitaAmpliada(false)}
      />

      <EditarMontoVentaModal venta={ventaEditando} onCerrar={() => setVentaEditando(null)} />
      <CancelarVentaModal venta={ventaCancelando} country={country} onCerrar={() => setVentaCancelando(null)} />
    </div>
  )
}

function EditarMontoVentaModal({ venta, onCerrar }: { venta: Sale | null; onCerrar: () => void }) {
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
      await editarMontoVenta(venta.id, valor)
      await queryClient.invalidateQueries({ queryKey: ['visitas'] })
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

function CancelarVentaModal({
  venta,
  country,
  onCerrar,
}: {
  venta: Sale | null
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
      await cancelarVenta(venta.id, motivo.trim(), profile.id)
      await queryClient.invalidateQueries({ queryKey: ['visitas'] })
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
              placeholder="Ej. Se registró en la tienda equivocada"
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
