import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  obtenerSemanaPorId,
  obtenerVisitasConVentas,
  obtenerGasolinaDeSemana,
  obtenerVentasEnvioDeSemana,
  obtenerParqueosDeSemana,
} from '../../lib/api'
import { formatMonto } from '../../lib/currency'
import { formatNumero } from '../../lib/numeros'
import { Spinner } from '../../components/Spinner'
import { FotoPrivada } from '../../components/FotoPrivada'
import { Modal } from '../../components/Modal'
import { IconChevron } from '../../components/icons'
import { MapaRuta } from './MapaRuta'
import { VisitaCard } from './VisitaCard'
import { GasolinaCard } from './GasolinaCard'
import { EnvioCard } from './EnvioCard'
import { ParqueoCard } from './ParqueoCard'
import type { CountryCode, TiendaConLugar } from '../../lib/types'

export function DetalleSemana({
  weekId,
  tiendasRegion,
  country,
  puedeAgregarVenta = false,
  onAgregarVenta = () => {},
  puedeEditarGasolina = false,
}: {
  weekId: string
  tiendasRegion?: TiendaConLugar[]
  country?: CountryCode | null
  puedeAgregarVenta?: boolean
  onAgregarVenta?: (visitId: string) => void
  puedeEditarGasolina?: boolean
}) {
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

  const [gasolinaAbierta, setGasolinaAbierta] = useState(false)

  if (semanaQuery.isLoading || visitasQuery.isLoading) return <Spinner texto="Cargando semana..." />
  if (!semanaQuery.data) return <p className="p-4 text-sm text-red-600">No se encontró la semana</p>

  const semana = semanaQuery.data
  const visitas = visitasQuery.data ?? []
  const gasolina = gasolinaQuery.data ?? []
  const ventasEnvio = ventasEnvioQuery.data ?? []
  const parqueos = parqueosQuery.data ?? []
  const totalVentas =
    visitas.reduce((suma, v) => suma + v.sales.reduce((s, venta) => s + Number(venta.amount), 0), 0) +
    ventasEnvio.reduce((suma, v) => suma + Number(v.amount), 0)
  const totalGasolina = gasolina.reduce((suma, g) => suma + Number(g.amount), 0)
  const ventasSinProcesar = visitas.reduce(
    (suma, v) => suma + v.sales.filter((venta) => !venta.processed).length,
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
        <FotoKilometraje etiqueta="Kilometraje inicial" km={semana.start_mileage_km} path={semana.start_mileage_photo_path} />
        <FotoKilometraje etiqueta="Kilometraje final" km={semana.end_mileage_km} path={semana.end_mileage_photo_path} />
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
          />
        ))}
        {visitas.length === 0 && <p className="text-sm text-slate-400">Sin visitas registradas.</p>}
      </SeccionColapsable>

      {ventasEnvio.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Ventas por envío</h3>
          <div className="space-y-3">
            {ventasEnvio.map((venta) => (
              <EnvioCard key={venta.id} venta={venta} country={country} />
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
}: {
  etiqueta: string
  km: number | null
  path: string | null
}) {
  return (
    <div className="card p-3">
      <p className="mb-2 text-xs text-slate-400">
        {etiqueta} {km != null && <span className="font-semibold text-slate-700">· {formatNumero(km)} km</span>}
      </p>
      {path ? (
        <FotoPrivada
          bucket="mileage-photos"
          path={path}
          alt={etiqueta}
          className="h-32 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
          Sin foto
        </div>
      )}
    </div>
  )
}
