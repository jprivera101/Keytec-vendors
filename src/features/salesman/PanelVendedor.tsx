import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { Spinner } from '../../components/Spinner'
import {
  obtenerSemanaActiva,
  obtenerVisitasConVentas,
  obtenerVentasEnvioDeSemana,
  obtenerTrackingAbierto,
  obtenerTrackingDeSemana,
} from '../../lib/api'
import { crearSemana, finalizarSemana } from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { formatNumero } from '../../lib/numeros'
import { fechaLocalISO } from '../../lib/fechas'
import { IniciarSemanaModal } from './IniciarSemanaModal'
import { FinalizarSemanaModal } from './FinalizarSemanaModal'
import { NuevaVisitaModal } from './NuevaVisitaModal'
import { NuevaGasolinaModal } from './NuevaGasolinaModal'
import { NuevaVentaEnvioModal } from './NuevaVentaEnvioModal'
import { NuevoDepositoModal } from './NuevoDepositoModal'
import { TrackingDiarioModal } from './TrackingDiarioModal'
import { IconBandera, IconRuta, IconTiendas } from '../../components/icons'

export function PanelVendedor() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile!.id

  const [modalIniciar, setModalIniciar] = useState(false)
  const [modalFinalizar, setModalFinalizar] = useState(false)
  const [modalVisita, setModalVisita] = useState(false)
  const [modalGasolina, setModalGasolina] = useState(false)
  const [modalEnvio, setModalEnvio] = useState(false)
  const [modalDeposito, setModalDeposito] = useState(false)
  const [modalTracking, setModalTracking] = useState(false)

  const semanaQuery = useQuery({
    queryKey: ['semana-activa', userId],
    queryFn: () => obtenerSemanaActiva(userId),
  })

  const semana = semanaQuery.data

  const trackingSemanaQuery = useQuery({
    queryKey: ['tracking-diario', semana?.id],
    queryFn: () => obtenerTrackingDeSemana(semana!.id),
    enabled: !!semana && !!profile?.daily_tracking_enabled,
  })
  const trackingAbiertoQuery = useQuery({
    queryKey: ['tracking-abierto', userId],
    queryFn: () => obtenerTrackingAbierto(userId),
    enabled: !!profile?.daily_tracking_enabled,
  })
  const trackingAbierto = trackingAbiertoQuery.data ?? null
  const trackingHoy = (trackingSemanaQuery.data ?? []).find((t) => t.tracking_date === fechaLocalISO())
  // Si el vendedor no tiene el toggle activo, nada de esto aplica: puede registrar visitas y
  // demas sin haber "empezado el dia" primero (comportamiento de siempre, sin cambios).
  const diaIniciado = !profile?.daily_tracking_enabled || !!trackingHoy
  const diaCerradoHoy = !!profile?.daily_tracking_enabled && !!trackingHoy && trackingHoy.ended_at != null
  // Una vez que ya terminó su día, ya no debe poder registrar visitas ni ventas por envío
  // (volverían a habilitarse mañana, al empezar un día nuevo) — gasolina y depósito no
  // dependen de esto, se pueden seguir registrando igual.
  const puedeVisitarYVender = !profile?.daily_tracking_enabled || (diaIniciado && !diaCerradoHoy)

  const visitasQuery = useQuery({
    queryKey: ['visitas', semana?.id],
    queryFn: () => obtenerVisitasConVentas(semana!.id),
    enabled: !!semana,
  })

  const ventasEnvioQuery = useQuery({
    queryKey: ['ventas-envio', semana?.id],
    queryFn: () => obtenerVentasEnvioDeSemana(semana!.id),
    enabled: !!semana,
  })

  const totalVentas =
    (visitasQuery.data ?? []).reduce(
      (suma, v) => suma + v.sales.reduce((s, venta) => s + Number(venta.amount), 0),
      0,
    ) + (ventasEnvioQuery.data ?? []).reduce((suma, v) => suma + Number(v.amount), 0)

  async function manejarIniciarSemana(km: number, fotoPath: string) {
    await crearSemana(userId, km, fotoPath)
    await queryClient.invalidateQueries({ queryKey: ['semana-activa', userId] })
    setModalIniciar(false)
  }

  async function manejarFinalizarSemana(km: number, fotoPath: string) {
    if (!semana) return
    await finalizarSemana(semana.id, km, fotoPath)
    await queryClient.invalidateQueries({ queryKey: ['semana-activa', userId] })
    setModalFinalizar(false)
  }

  if (semanaQuery.isLoading) return <Spinner texto="Cargando..." />

  return (
    <>
      {!semana && (
        <div className="card p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <IconRuta width={24} height={24} />
          </span>
          <p className="mt-3 font-medium text-slate-700">No tienes una semana activa</p>
          <p className="mt-1 text-sm text-slate-400">
            Inicia tu semana para poder registrar visitas y ventas.
          </p>
          <button type="button" onClick={() => setModalIniciar(true)} className="btn-primary mt-4 w-full py-3">
            Iniciar semana
          </button>
        </div>
      )}

      {semana && (
        <>
          <div className="card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-ink-700 via-brand-700 to-highlight-400" />
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  ● Semana activa
                </span>
                <span className="text-xs text-slate-400">
                  Desde {new Date(semana.start_date).toLocaleDateString('es-GT')}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Kilometraje inicial: <span className="font-semibold text-slate-700">{formatNumero(semana.start_mileage_km)} km</span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{visitasQuery.data?.length ?? 0}</p>
                  <p className="text-xs text-slate-500">Visitas esta semana</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{formatMonto(totalVentas, profile?.country)}</p>
                  <p className="text-xs text-slate-500">Vendido esta semana</p>
                </div>
              </div>

              <Link
                to="/vendedor/ruta"
                className="mt-3 block text-center text-sm font-semibold text-brand-700 hover:underline"
              >
                Ver mi ruta completa →
              </Link>
            </div>
          </div>

          {profile?.daily_tracking_enabled && trackingAbierto && (
            <div className="card flex items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">🚗 Día en curso</p>
                <p className="text-xs text-slate-400">Km inicial: {formatNumero(trackingAbierto.start_km)}</p>
              </div>
              <button type="button" onClick={() => setModalTracking(true)} className="btn-secondary btn-sm">
                🏁 Terminar día
              </button>
            </div>
          )}

          {!diaIniciado ? (
            <div className="card p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-2xl">
                🚗
              </span>
              <p className="mt-3 font-medium text-slate-700">Antes de continuar, registra el inicio de tu día</p>
              <p className="mt-1 text-sm text-slate-400">
                Foto del carro + kilometraje inicial. Después de esto puedes registrar visitas, ventas por
                envío, gasolina y depósitos con normalidad.
              </p>
              <button
                type="button"
                onClick={() => setModalTracking(true)}
                className="btn-primary mt-4 w-full py-3"
              >
                Empezar día
              </button>
            </div>
          ) : (
            <>
              {diaCerradoHoy && (
                <p className="text-center text-xs text-slate-400">
                  Ya terminaste tu día — no puedes registrar visitas ni ventas por envío hasta mañana.
                </p>
              )}

              {puedeVisitarYVender && (
                <button type="button" onClick={() => setModalVisita(true)} className="btn-primary w-full py-3.5">
                  <IconTiendas width={20} height={20} /> Registrar visita a tienda
                </button>
              )}

              <div className={`grid gap-2 ${puedeVisitarYVender ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {puedeVisitarYVender && (
                  <button type="button" onClick={() => setModalEnvio(true)} className="btn-secondary py-3 text-sm">
                    📦 Envío
                  </button>
                )}
                <button type="button" onClick={() => setModalGasolina(true)} className="btn-secondary py-3 text-sm">
                  ⛽ Gasolina
                </button>
                <button type="button" onClick={() => setModalDeposito(true)} className="btn-secondary py-3 text-sm">
                  💰 Depósito
                </button>
              </div>
            </>
          )}

          <button type="button" onClick={() => setModalFinalizar(true)} className="btn-secondary w-full py-3">
            <IconBandera width={18} height={18} /> Finalizar semana
          </button>
        </>
      )}

      <IniciarSemanaModal
        abierto={modalIniciar}
        userId={userId}
        onCerrar={() => setModalIniciar(false)}
        onConfirmar={manejarIniciarSemana}
      />

      {semana && (
        <FinalizarSemanaModal
          abierto={modalFinalizar}
          kmInicial={semana.start_mileage_km}
          userId={userId}
          onCerrar={() => setModalFinalizar(false)}
          onConfirmar={manejarFinalizarSemana}
        />
      )}

      {semana && profile?.country && (
        <NuevaVisitaModal
          abierto={modalVisita}
          weekId={semana.id}
          userId={userId}
          country={profile.country}
          onCerrar={() => setModalVisita(false)}
          onCreada={() => {
            setModalVisita(false)
            queryClient.invalidateQueries({ queryKey: ['visitas', semana.id] })
          }}
        />
      )}

      {semana && (
        <NuevaGasolinaModal
          abierto={modalGasolina}
          weekId={semana.id}
          userId={userId}
          country={profile?.country}
          onCerrar={() => setModalGasolina(false)}
          onCreada={() => {
            setModalGasolina(false)
            queryClient.invalidateQueries({ queryKey: ['gasolina', semana.id] })
          }}
        />
      )}

      {semana && (
        <NuevaVentaEnvioModal
          abierto={modalEnvio}
          weekId={semana.id}
          userId={userId}
          country={profile?.country}
          onCerrar={() => setModalEnvio(false)}
          onCreada={() => {
            setModalEnvio(false)
            queryClient.invalidateQueries({ queryKey: ['ventas-envio', semana.id] })
          }}
        />
      )}

      {semana && (
        <NuevoDepositoModal
          abierto={modalDeposito}
          userId={userId}
          onCerrar={() => setModalDeposito(false)}
          onCreado={() => {
            setModalDeposito(false)
            queryClient.invalidateQueries({ queryKey: ['depositos'] })
          }}
        />
      )}

      {semana && (
        <TrackingDiarioModal
          abierto={modalTracking}
          modo={trackingAbierto ? 'terminar' : 'empezar'}
          weekId={semana.id}
          userId={userId}
          trackingAbierto={trackingAbierto}
          onCerrar={() => setModalTracking(false)}
          onListo={() => {
            setModalTracking(false)
            queryClient.invalidateQueries({ queryKey: ['tracking-diario', semana.id] })
            queryClient.invalidateQueries({ queryKey: ['tracking-abierto', userId] })
          }}
        />
      )}
    </>
  )
}
