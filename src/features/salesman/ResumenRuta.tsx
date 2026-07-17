import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  obtenerSemanaPorId,
  obtenerVisitasConVentas,
  obtenerGasolinaDeSemana,
  obtenerVentasEnvioDeSemana,
  obtenerDepositosDeVendedorEnRango,
  obtenerParqueoAbierto,
  obtenerParqueosDeSemana,
} from '../../lib/api'
import { obtenerTiendasPorRegion } from '../../lib/tiendas'
import { formatMonto } from '../../lib/currency'
import { useAuth } from '../../lib/useAuth'
import { Spinner } from '../../components/Spinner'
import { IconChevron } from '../../components/icons'
import { MapaRuta } from '../shared/MapaRuta'
import { VisitaCard } from '../shared/VisitaCard'
import { GasolinaCard } from '../shared/GasolinaCard'
import { EnvioCard } from '../shared/EnvioCard'
import { DepositoCard } from '../shared/DepositoCard'
import { ParqueoModal } from './ParqueoModal'
import { rangoDeSemana } from '../../lib/rangoSemana'

interface Props {
  weekId: string
  puedeAgregarVenta?: boolean
  onAgregarVenta?: (visitId: string) => void
}

/** Vista simple para el vendedor: un resumen limpio de la semana (visitas, tiendas distintas,
 * total vendido, km recorridos), el mapa de su ruta y sus visitas en formato compacto. El
 * mapa solo muestra su propia semana y las tiendas de su región que ÉL registró — la RLS de
 * "stores" ya filtra por created_by, así que si otro vendedor comparte la misma región, sus
 * tiendas no aparecen aquí. */
export function ResumenRuta({ weekId, puedeAgregarVenta = false, onAgregarVenta = () => {} }: Props) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [mapaVisitasAbierto, setMapaVisitasAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [modalParqueo, setModalParqueo] = useState(false)
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
  const tiendasRegionQuery = useQuery({
    queryKey: ['tiendas-region', profile?.route_id],
    queryFn: () => obtenerTiendasPorRegion(profile!.route_id!),
    enabled: !!profile?.route_id,
  })
  const depositosQuery = useQuery({
    queryKey: ['depositos', profile?.id, semanaQuery.data?.start_date, semanaQuery.data?.end_date],
    queryFn: () => {
      const { desde, hasta } = rangoDeSemana(semanaQuery.data!)
      return obtenerDepositosDeVendedorEnRango(profile!.id, desde, hasta)
    },
    enabled: !!profile?.id && !!semanaQuery.data,
  })
  const parqueosSemanaQuery = useQuery({
    queryKey: ['parqueos', weekId],
    queryFn: () => obtenerParqueosDeSemana(weekId),
  })
  const parqueoAbiertoQuery = useQuery({
    queryKey: ['parqueo-abierto', profile?.id],
    queryFn: () => obtenerParqueoAbierto(profile!.id),
    enabled: !!profile?.id,
  })

  if (semanaQuery.isLoading || visitasQuery.isLoading) return <Spinner texto="Cargando..." />
  if (!semanaQuery.data) return <p className="text-sm text-red-600">No se encontró la semana</p>

  const semana = semanaQuery.data
  const visitas = visitasQuery.data ?? []
  const gasolina = gasolinaQuery.data ?? []
  const ventasEnvio = ventasEnvioQuery.data ?? []
  const depositos = depositosQuery.data ?? []
  const parqueos = parqueosSemanaQuery.data ?? []
  const parqueoAbierto = parqueoAbiertoQuery.data ?? null
  const totalVentas =
    visitas.reduce((suma, v) => suma + v.sales.reduce((s, venta) => s + Number(venta.amount), 0), 0) +
    ventasEnvio.reduce((suma, v) => suma + Number(v.amount), 0)
  const tiendasDistintas = new Set(visitas.map((v) => v.store_id ?? v.store_name ?? v.id)).size
  const kmRecorridos =
    semana.end_mileage_km != null ? semana.end_mileage_km - semana.start_mileage_km : null

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-ink-700 via-brand-700 to-highlight-400" />
        <div className="flex items-center justify-between p-4">
          <div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                semana.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {semana.status === 'active' ? '● Ruta activa' : 'Ruta completada'}
            </span>
            <p className="mt-1.5 text-xs text-slate-400">
              Desde {new Date(semana.start_date).toLocaleDateString('es-GT')}
              {semana.end_date && ` hasta ${new Date(semana.end_date).toLocaleDateString('es-GT')}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{formatMonto(totalVentas, profile?.country)}</p>
            <p className="text-xs text-slate-400">total vendido</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile etiqueta="Visitas" valor={String(visitas.length)} />
        <StatTile etiqueta="Tiendas" valor={String(tiendasDistintas)} />
        <StatTile etiqueta="Km recorridos" valor={kmRecorridos != null ? `${kmRecorridos}` : '—'} />
      </div>

      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setMapaVisitasAbierto((v) => !v)}
          className="flex w-full items-center justify-between p-3 text-left"
        >
          <h3 className="text-sm font-semibold text-slate-500">Mapa y visitas</h3>
          <IconChevron
            className={`text-slate-400 transition-transform ${mapaVisitasAbierto ? 'rotate-180' : ''}`}
          />
        </button>

        {mapaVisitasAbierto && (
          <div className="space-y-4 border-t border-slate-100 p-3">
            <div className="relative">
              <MapaRuta
                visitas={visitas}
                tiendasRegion={tiendasRegionQuery.data ?? []}
                country={profile?.country}
                alturaClase="h-48"
                parkingSpots={parqueos}
                popupMaxHeight={110}
              />
              {semana.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setModalParqueo(true)}
                  className="absolute bottom-3 right-3 z-[1000] rounded-full bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-md"
                >
                  {parqueoAbierto ? '🚗 Salir del parqueo' : '🅿️ Marcar parqueo'}
                </button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-500">Visitas</h3>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar tienda..."
                  className="input-field w-40 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-3">
                {[...visitas]
                  .reverse()
                  .filter((visita) =>
                    (visita.store_name ?? '').toLowerCase().includes(busqueda.trim().toLowerCase()),
                  )
                  .map((visita) => (
                    <VisitaCard
                      key={visita.id}
                      visita={visita}
                      puedeAgregarVenta={puedeAgregarVenta}
                      onAgregarVenta={onAgregarVenta}
                      country={profile?.country}
                    />
                  ))}
                {visitas.length === 0 && <p className="text-sm text-slate-400">Sin visitas registradas.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {ventasEnvio.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Ventas por envío</h3>
          <div className="space-y-3">
            {ventasEnvio.map((venta) => (
              <EnvioCard key={venta.id} venta={venta} country={profile?.country} />
            ))}
          </div>
        </div>
      )}

      {gasolina.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Gasolina</h3>
          <div className="space-y-3">
            {gasolina.map((registro) => (
              <GasolinaCard key={registro.id} registro={registro} country={profile?.country} />
            ))}
          </div>
        </div>
      )}

      {depositos.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Depósitos</h3>
          <div className="space-y-3">
            {depositos.map((deposito) => (
              <DepositoCard key={deposito.id} deposito={deposito} />
            ))}
          </div>
        </div>
      )}

      {profile && (
        <ParqueoModal
          abierto={modalParqueo}
          modo={parqueoAbierto ? 'cerrar' : 'abrir'}
          weekId={weekId}
          userId={profile.id}
          parqueoAbierto={parqueoAbierto}
          onCerrar={() => setModalParqueo(false)}
          onListo={() => {
            setModalParqueo(false)
            queryClient.invalidateQueries({ queryKey: ['parqueos', weekId] })
            queryClient.invalidateQueries({ queryKey: ['parqueo-abierto', profile.id] })
          }}
        />
      )}
    </div>
  )
}

function StatTile({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xl font-bold text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{etiqueta}</p>
    </div>
  )
}
