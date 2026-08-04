import { Fragment, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FotoPrivada } from '../../components/FotoPrivada'
import { formatMonto } from '../../lib/currency'
import type { VisitaConVendedor } from '../../lib/api'
import type { CountryCode } from '../../lib/types'

// Paleta amplia para distinguir muchos vendedores a la vez (a diferencia de MapaRuta, que
// colorea por día porque ahí solo hay UN vendedor). Se repite si hay más vendedores que
// colores, pero para un equipo tipico (decenas, no cientos) alcanza sin repetir.
const PALETA = [
  '#2D77BD', '#EA5A33', '#382E88', '#16A34A', '#DB2777',
  '#CA8A04', '#0EA5E9', '#7C3AED', '#059669', '#D97706',
]

function colorDeVendedor(indice: number) {
  return PALETA[indice % PALETA.length]
}

function iconoNumerado(numero: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;width:24px;height:24px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${numero}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function AjustarLimites({ posiciones }: { posiciones: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (posiciones.length === 0) return
    if (posiciones.length === 1) {
      map.setView(posiciones[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(posiciones), { padding: [32, 32] })
    }
  }, [map, posiciones])
  return null
}

export interface VendedorConVisitas {
  id: string
  full_name: string
  visitas: VisitaConVendedor[]
}

interface Props {
  vendedores: VendedorConVisitas[]
  country?: CountryCode | null
}

/** Mapa comparativo: superpone la ruta de varios vendedores en la misma semana calendario,
 * uno por color, con casillas para aislar a uno o unos pocos ("track each vendedor"). Solo
 * lista vendedores con al menos una visita esa semana -- mostrar a todo el equipo con
 * casillas vacías no ayuda cuando la mayoría no trabajó ese rango. */
export function MapaMultiVendedor({ vendedores, country }: Props) {
  const conVisitas = vendedores.filter((v) => v.visitas.length > 0)
  const [ocultos, setOcultos] = useState<Set<string>>(new Set())

  function alternar(id: string) {
    setOcultos((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  if (conVisitas.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
        Sin visitas registradas en esta semana
      </div>
    )
  }

  const visibles = conVisitas.filter((v) => !ocultos.has(v.id))
  const todasLasPosiciones: [number, number][] = visibles.flatMap((v) =>
    v.visitas.map((visita): [number, number] => [visita.latitude, visita.longitude]),
  )

  return (
    <div>
      <div className="h-96 w-full overflow-hidden rounded-xl">
        <MapContainer
          center={todasLasPosiciones[0] ?? [14.6, -90.5]}
          zoom={11}
          maxZoom={19}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <AjustarLimites posiciones={todasLasPosiciones} />
          {conVisitas.map((vendedor, i) => {
            if (ocultos.has(vendedor.id)) return null
            const color = colorDeVendedor(i)
            const visitasOrdenadas = [...vendedor.visitas].sort((a, b) =>
              a.captured_at.localeCompare(b.captured_at),
            )
            return (
              <Fragment key={vendedor.id}>
                {visitasOrdenadas.slice(1).map((visita, idx) => (
                  <Polyline
                    key={visita.id}
                    positions={[
                      [visitasOrdenadas[idx].latitude, visitasOrdenadas[idx].longitude],
                      [visita.latitude, visita.longitude],
                    ]}
                    color={color}
                    weight={3}
                  />
                ))}
                {visitasOrdenadas.map((visita, idx) => {
                  const total = visita.sales.reduce((s, v) => s + Number(v.amount), 0)
                  return (
                    <Marker
                      key={visita.id}
                      position={[visita.latitude, visita.longitude]}
                      icon={iconoNumerado(idx + 1, color)}
                    >
                      <Popup maxHeight={220}>
                        <div className="w-40">
                          <FotoPrivada
                            bucket="visit-photos"
                            path={visita.photo_path}
                            alt="Foto de la tienda"
                            className="mb-2 h-24 w-full rounded object-cover"
                          />
                          <p className="text-xs font-semibold" style={{ color }}>
                            {vendedor.full_name}
                          </p>
                          <p className="text-sm font-semibold">{visita.store_name || 'Tienda sin nombre'}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(visita.captured_at).toLocaleString('es-GT')}
                          </p>
                          <p className="mt-1 text-xs font-medium text-brand-700">
                            {visita.sales.length} venta{visita.sales.length !== 1 && 's'} · {formatMonto(total, country)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </Fragment>
            )
          })}
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {conVisitas.map((vendedor, i) => (
          <label key={vendedor.id} className="flex cursor-pointer items-center gap-1.5 select-none">
            <input
              type="checkbox"
              checked={!ocultos.has(vendedor.id)}
              onChange={() => alternar(vendedor.id)}
              className="h-3.5 w-3.5 rounded border-slate-300"
              style={{ accentColor: colorDeVendedor(i) }}
            />
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorDeVendedor(i) }} />
            <span className="text-slate-600">
              {vendedor.full_name} <span className="text-slate-400">({vendedor.visitas.length})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
