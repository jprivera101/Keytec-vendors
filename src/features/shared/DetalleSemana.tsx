import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  obtenerSemanaPorId,
  obtenerVisitasConVentas,
  obtenerGasolinaDeSemana,
  obtenerVentasEnvioDeSemana,
  obtenerParqueosDeSemana,
  obtenerTrackingDeSemana,
  editarKmSemana,
} from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { formatNumero } from '../../lib/numeros'
import { Spinner } from '../../components/Spinner'
import { FotoPrivada } from '../../components/FotoPrivada'
import { VisorFotoZoom } from '../../components/VisorFotoZoom'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { MapaRuta } from './MapaRuta'
import { VisitaCard } from './VisitaCard'
import { GasolinaCard } from './GasolinaCard'
import { EnvioCard } from './EnvioCard'
import { ParqueoCard } from './ParqueoCard'
import { TrackingDiarioCard } from './TrackingDiarioCard'
import type { CountryCode, TiendaConLugar } from '../../lib/types'

export function DetalleSemana({
  weekId,
  tiendasRegion,
  country,
  puedeAgregarVenta = false,
  onAgregarVenta = () => {},
  puedeEditarGasolina = false,
  puedeReabrirTracking = false,
  puedeEditarKm = false,
  puedeGestionarVentas = false,
}: {
  weekId: string
  tiendasRegion?: TiendaConLugar[]
  country?: CountryCode | null
  puedeAgregarVenta?: boolean
  onAgregarVenta?: (visitId: string) => void
  puedeEditarGasolina?: boolean
  puedeReabrirTracking?: boolean
  /** Super admin: puede corregir un km mal tecleado (semana y tracking diario). */
  puedeEditarKm?: boolean
  /** Admin/super_admin: puede corregir el monto o cancelar una venta (con motivo). */
  puedeGestionarVentas?: boolean
}) {
  const queryClient = useQueryClient()
  const semanaQuery = useQuery({
    queryKey: ['semana', weekId],
    queryFn: () => obtenerSemanaPorId(weekId),
  })

  const visitasQuery = useQuery({
    queryKey: ['visitas', weekId],
    queryFn: () => obtenerVisitasConVentas(weekId),
  })

  const gasolinaQuery = useQuery({
    queryKey: ['gasolina', weekId],
    queryFn: () => obtenerGasolinaDeSemana(weekId),
  })

  const ventasEnvioQuery = useQuery({
    queryKey: ['ventas-envio', weekId],
    queryFn: () => obtenerVentasEnvioDeSemana(weekId),
  })

  const parqueosQuery = useQuery({
    queryKey: ['parqueos', weekId],
    queryFn: () => obtenerParqueosDeSemana(weekId),
  })

  const trackingQuery = useQuery({
    queryKey: ['tracking-diario', weekId],
    queryFn: () => obtenerTrackingDeSemana(weekId),
  })

  const [gasolinaAbierta, setGasolinaAbierta] = useState(false)

  if (semanaQuery.isLoading || visitasQuery.isLoading) return <Spinner texto="Cargando semana..." />
  if (!semanaQuery.data) return <p className="p-4 text-sm text-red-600">No se encontró la semana</p>

  const semana = semanaQuery.data
  const visitas = visitasQuery.data ?? []
  const gasolina = gasolinaQuery.data ?? []
  const ventasEnvio = ventasEnvioQuery.data ?? []
  const parqueos = parqueosQuery.data ?? []
  const tracking = trackingQuery.data ?? []
  const totalVentas =
    visitas.reduce(
      (suma, v) => suma + v.sales.filter((venta) => !venta.cancelled).reduce((s, venta) => s + Number(venta.amount), 0),
      0,
    ) + ventasEnvio.filter((v) => !v.cancelled).reduce((suma, v) => suma + Number(v.amount), 0)
  const totalGasolina = gasolina.reduce((suma, g) => suma + Number(g.amount), 0)
  const ventasSinProcesar = visitas.reduce(
    (suma, v) => suma + v.sales.filter((venta) => !venta.processed && !venta.cancelled).length,
    0,
  )
  const kmRecorridos =
    semana.end_mileage_km != null ? semana.end_mileage_km - semana.start_mileage_km : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          etiqueta="Estado"
          valor={semana.status === 'active' ? 'Activa' : 'Completada'}
        />
        <StatCard etiqueta="Km recorridos" valor={kmRecorridos != null ? `${formatNumero(kmRecorridos)} km` : '—'} />
        <StatCard etiqueta="Visitas" valor={String(visitas.length)} />
        <StatCard etiqueta="Total vendido" valor={formatMonto(totalVentas, country)} />
        <StatCard
          etiqueta="⛽ Gasolina"
          valor={formatMonto(totalGasolina, country)}
          onClick={gasolina.length > 0 ? () => setGasolinaAbierta(true) : undefined}
        />
        <StatCard etiqueta="Ventas sin procesar" valor={String(ventasSinProcesar)} resaltar={ventasSinProcesar > 0} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FotoKilometraje
          etiqueta="Kilometraje inicial"
          km={semana.start_mileage_km}
          path={semana.start_mileage_photo_path}
          puedeEditar={puedeEditarKm}
          onGuardar={(nuevoValor) => editarKmSemana(semana.id, nuevoValor, semana.end_mileage_km)}
          onEditado={() => queryClient.invalidateQueries({ queryKey: ['semana', weekId] })}
        />
        <FotoKilometraje
          etiqueta="Kilometraje final"
          km={semana.end_mileage_km}
          path={semana.end_mileage_photo_path}
          puedeEditar={puedeEditarKm && semana.end_mileage_km != null}
          onGuardar={(nuevoValor) => editarKmSemana(semana.id, semana.start_mileage_km, nuevoValor)}
          onEditado={() => queryClient.invalidateQueries({ queryKey: ['semana', weekId] })}
        />
      </div>

      <MapaRuta visitas={visitas} tiendasRegion={tiendasRegion} country={country} parkingSpots={parqueos} />

      <SeccionColapsable titulo="Visitas" cantidad={visitas.length}>
        {visitas.map((visita) => (
          <VisitaCard
            key={visita.id}
            visita={visita}
            puedeAgregarVenta={puedeAgregarVenta}
            onAgregarVenta={onAgregarVenta}
            country={country}
            puedeGestionarVentas={puedeGestionarVentas}
          />
        ))}
        {visitas.length === 0 && <p className="text-sm text-slate-400">Sin visitas registradas.</p>}
      </SeccionColapsable>

      {ventasEnvio.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Ventas por envío</h3>
          <div className="space-y-3">
            {ventasEnvio.map((venta) => (
              <EnvioCard
                key={venta.id}
                venta={venta}
                country={country}
                puedeGestionarVentas={puedeGestionarVentas}
              />
            ))}
          </div>
        </div>
      )}

      <SeccionColapsable titulo="🅿️ Parqueo" cantidad={parqueos.length}>
        {parqueos.map((parqueo) => (
          <ParqueoCard key={parqueo.id} parqueo={parqueo} />
        ))}
        {parqueos.length === 0 && <p className="text-sm text-slate-400">Sin parqueos registrados.</p>}
      </SeccionColapsable>

      {tracking.length > 0 && (
        <SeccionColapsable titulo="🚗 Tracking diario" cantidad={tracking.length}>
          {tracking.map((dia) => (
            <TrackingDiarioCard
              key={dia.id}
              tracking={dia}
              puedeReabrir={puedeReabrirTracking}
              puedeEditarKm={puedeEditarKm}
            />
          ))}
        </SeccionColapsable>
      )}

      <Modal titulo="Gasolina de la semana" abierto={gasolinaAbierta} onCerrar={() => setGasolinaAbierta(false)}>
        <div className="space-y-3">
          {gasolina.map((registro) => (
            <GasolinaCard
              key={registro.id}
              registro={registro}
              country={country}
              puedeEditar={puedeEditarGasolina}
            />
          ))}
        </div>
      </Modal>
    </div>
  )
}

/** Sección colapsada por defecto: el título muestra la cantidad para dar una idea del
 * tamaño sin tener que desplegarla primero (evita abrumar con, por ejemplo, 40+ visitas). */
function SeccionColapsable({
  titulo,
  cantidad,
  children,
}: {
  titulo: string
  cantidad: number
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <h3 className="text-sm font-semibold text-slate-500">
          {titulo} <span className="text-slate-400">({cantidad})</span>
        </h3>
        <IconChevron className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && <div className="space-y-3 border-t border-slate-100 p-3">{children}</div>}
    </div>
  )
}

function StatCard({
  etiqueta,
  valor,
  onClick,
  resaltar = false,
}: {
  etiqueta: string
  valor: string
  onClick?: () => void
  resaltar?: boolean
}) {
  const contenido = (
    <>
      <p className={`text-xs ${resaltar ? 'text-amber-600' : 'text-slate-400'}`}>{etiqueta}</p>
      <p className={`mt-1 text-sm font-bold ${resaltar ? 'text-amber-700' : 'text-slate-900'}`}>{valor}</p>
      {onClick && <p className="mt-0.5 text-[10px] font-medium text-brand-700">Ver detalle →</p>}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`card p-3 text-center transition-colors hover:bg-slate-50 ${resaltar ? 'bg-amber-50' : ''}`}
      >
        {contenido}
      </button>
    )
  }

  return <div className={`card p-3 text-center ${resaltar ? 'bg-amber-50' : ''}`}>{contenido}</div>
}

function FotoKilometraje({
  etiqueta,
  km,
  path,
  puedeEditar = false,
  onGuardar,
  onEditado,
}: {
  etiqueta: string
  km: number | null
  path: string | null
  puedeEditar?: boolean
  onGuardar?: (nuevoValor: number) => Promise<unknown>
  onEditado?: () => void
}) {
  const [ampliada, setAmpliada] = useState(false)
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function abrirEdicion() {
    setValor(km != null ? String(km) : '')
    setError(null)
    setEditando(true)
  }

  async function guardar() {
    const nuevoValor = Number(valor)
    if (!valor || Number.isNaN(nuevoValor) || nuevoValor < 0) {
      setError('Ingresa un kilometraje válido')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar?.(nuevoValor)
      onEditado?.()
      setEditando(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {etiqueta} {km != null && <span className="font-semibold text-slate-700">· {formatNumero(km)} km</span>}
        </p>
        {puedeEditar && (
          <button type="button" onClick={abrirEdicion} className="text-xs font-medium text-brand-700 hover:underline">
            ✏️ Editar
          </button>
        )}
      </div>
      {path ? (
        <>
          <button type="button" onClick={() => setAmpliada(true)} className="block w-full">
            <FotoPrivada
              bucket="mileage-photos"
              path={path}
              alt={etiqueta}
              className="h-32 w-full rounded-lg object-cover"
            />
          </button>
          <VisorFotoZoom
            bucket="mileage-photos"
            path={path}
            alt={etiqueta}
            abierto={ampliada}
            onCerrar={() => setAmpliada(false)}
          />
        </>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
          Sin foto
        </div>
      )}

      <Modal titulo={`Editar ${etiqueta.toLowerCase()}`} abierto={editando} onCerrar={() => setEditando(false)}>
        <div className="space-y-3">
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="input-field text-base"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" onClick={guardar} disabled={guardando} className="btn-primary w-full py-2.5">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
