import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { formatNumero } from '../../lib/numeros'
import { reabrirTrackingDiario } from '../../lib/api'
import type { DailyTracking } from '../../lib/types'

interface Props {
  tracking: DailyTracking
  /** Si el admin puede deshacer el cierre de este día (el vendedor cerró por error). */
  puedeReabrir?: boolean
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-GT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })
}

/** Fila compacta (🚗 + fecha + km recorridos); expande para ver las fotos del carro al
 * empezar y terminar el día (la del final solo si ya se cerró ese día). */
export function TrackingDiarioCard({ tracking, puedeReabrir = false }: Props) {
  const queryClient = useQueryClient()
  const [expandido, setExpandido] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<'inicio' | 'fin' | null>(null)
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false)
  const [reabriendo, setReabriendo] = useState(false)
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null)
  const cerrado = tracking.end_km != null

  async function manejarReabrir() {
    setReabriendo(true)
    setErrorReabrir(null)
    try {
      await reabrirTrackingDiario(tracking.id)
      await queryClient.invalidateQueries({ queryKey: ['tracking-diario', tracking.week_id] })
      setConfirmandoReabrir(false)
    } catch (e) {
      setErrorReabrir((e as Error).message)
    } finally {
      setReabriendo(false)
    }
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-highlight-400/20 text-xl">
          🚗
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold capitalize text-slate-900">
            {formatearFecha(tracking.tracking_date)}
          </p>
          <p className="text-xs text-slate-400">
            {cerrado
              ? `${formatNumero(tracking.start_km)} → ${formatNumero(tracking.end_km!)} km`
              : `Km inicial: ${formatNumero(tracking.start_km)}`}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold text-slate-900">
          {cerrado ? `${formatNumero(tracking.end_km! - tracking.start_km)} km` : 'En curso'}
        </p>
        <IconChevron
          className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {expandido && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
          <button type="button" onClick={() => setFotoAmpliada('inicio')} className="text-center">
            <FotoPrivada
              bucket="daily-tracking-photos"
              path={tracking.start_photo_path}
              alt="Foto del carro al empezar el día"
              className="h-24 w-full rounded-lg object-cover"
            />
            <p className="mt-1 text-[10px] text-slate-400">Al empezar</p>
          </button>
          {tracking.end_photo_path ? (
            <button type="button" onClick={() => setFotoAmpliada('fin')} className="text-center">
              <FotoPrivada
                bucket="daily-tracking-photos"
                path={tracking.end_photo_path}
                alt="Foto del carro al terminar el día"
                className="h-24 w-full rounded-lg object-cover"
              />
              <p className="mt-1 text-[10px] text-slate-400">Al terminar</p>
            </button>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 text-center text-[10px] text-slate-400">
              Día aún no terminado
            </div>
          )}

          {puedeReabrir && cerrado && (
            <div className="col-span-2">
              {!confirmandoReabrir ? (
                <button
                  type="button"
                  onClick={() => setConfirmandoReabrir(true)}
                  className="text-xs font-medium text-amber-700 hover:underline"
                >
                  ¿Se cerró por error? Reabrir este día
                </button>
              ) : (
                <div className="space-y-2 rounded-lg bg-amber-50 p-2">
                  <p className="text-xs text-amber-700">
                    El vendedor podrá volver a marcar "Terminar día" con el km correcto. ¿Confirmas?
                  </p>
                  {errorReabrir && <p className="text-xs text-red-600">{errorReabrir}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmandoReabrir(false)}
                      disabled={reabriendo}
                      className="btn-secondary btn-sm flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={manejarReabrir}
                      disabled={reabriendo}
                      className="btn-primary btn-sm flex-1"
                    >
                      {reabriendo ? 'Reabriendo...' : 'Sí, reabrir'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        titulo={fotoAmpliada === 'inicio' ? 'Foto al empezar el día' : 'Foto al terminar el día'}
        abierto={!!fotoAmpliada}
        onCerrar={() => setFotoAmpliada(null)}
      >
        {fotoAmpliada && (
          <FotoPrivada
            bucket="daily-tracking-photos"
            path={fotoAmpliada === 'inicio' ? tracking.start_photo_path : tracking.end_photo_path!}
            alt="Foto"
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  )
}
