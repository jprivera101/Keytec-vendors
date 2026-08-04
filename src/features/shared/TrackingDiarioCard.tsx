import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FotoPrivada } from '../../components/FotoPrivada'
import { VisorFotoZoom } from '../../components/VisorFotoZoom'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { formatNumero } from '../../lib/numeros'
import { reabrirTrackingDiario, editarKmTrackingDiario } from '../../lib/api'
import type { DailyTracking } from '../../lib/types'

interface Props {
  tracking: DailyTracking
  /** Si el admin puede deshacer el cierre de este día (el vendedor cerró por error). */
  puedeReabrir?: boolean
  /** Super admin: puede corregir un km mal tecleado sin borrar el cierre ni las fotos. */
  puedeEditarKm?: boolean
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
export function TrackingDiarioCard({ tracking, puedeReabrir = false, puedeEditarKm = false }: Props) {
  const queryClient = useQueryClient()
  const [expandido, setExpandido] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<'inicio' | 'fin' | null>(null)
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false)
  const [reabriendo, setReabriendo] = useState(false)
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null)
  const [editandoKm, setEditandoKm] = useState(false)
  const [startKmEditado, setStartKmEditado] = useState('')
  const [endKmEditado, setEndKmEditado] = useState('')
  const [guardandoKm, setGuardandoKm] = useState(false)
  const [errorKm, setErrorKm] = useState<string | null>(null)
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

  function abrirEdicionKm() {
    setStartKmEditado(String(tracking.start_km))
    setEndKmEditado(cerrado ? String(tracking.end_km) : '')
    setErrorKm(null)
    setEditandoKm(true)
  }

  async function guardarKm() {
    const nuevoStart = Number(startKmEditado)
    const nuevoEnd = cerrado ? Number(endKmEditado) : null
    if (!startKmEditado || Number.isNaN(nuevoStart) || nuevoStart < 0) {
      setErrorKm('Ingresa un km inicial válido')
      return
    }
    if (cerrado && (!endKmEditado || Number.isNaN(nuevoEnd) || (nuevoEnd as number) < 0)) {
      setErrorKm('Ingresa un km final válido')
      return
    }
    if (nuevoEnd != null && nuevoEnd < nuevoStart) {
      setErrorKm('El km final no puede ser menor al inicial')
      return
    }
    setGuardandoKm(true)
    setErrorKm(null)
    try {
      await editarKmTrackingDiario(tracking.id, nuevoStart, nuevoEnd)
      await queryClient.invalidateQueries({ queryKey: ['tracking-diario', tracking.week_id] })
      setEditandoKm(false)
    } catch (e) {
      setErrorKm((e as Error).message)
    } finally {
      setGuardandoKm(false)
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

          {puedeEditarKm && (
            <div className="col-span-2">
              <button
                type="button"
                onClick={abrirEdicionKm}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                ✏️ Editar km
              </button>
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

      <VisorFotoZoom
        bucket="daily-tracking-photos"
        path={fotoAmpliada ? (fotoAmpliada === 'inicio' ? tracking.start_photo_path : tracking.end_photo_path) : null}
        alt="Foto"
        abierto={!!fotoAmpliada}
        onCerrar={() => setFotoAmpliada(null)}
      />

      <Modal titulo="Editar kilometraje del día" abierto={editandoKm} onCerrar={() => setEditandoKm(false)}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Km inicial</label>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={startKmEditado}
              onChange={(e) => setStartKmEditado(e.target.value)}
              className="input-field text-base"
            />
          </div>
          {cerrado && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Km final</label>
              <input
                type="number"
                inputMode="decimal"
                value={endKmEditado}
                onChange={(e) => setEndKmEditado(e.target.value)}
                className="input-field text-base"
              />
            </div>
          )}
          {errorKm && <p className="text-sm text-red-600">{errorKm}</p>}
          <button type="button" onClick={guardarKm} disabled={guardandoKm} className="btn-primary w-full py-2.5">
            {guardandoKm ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
