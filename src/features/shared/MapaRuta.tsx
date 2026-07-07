import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FotoPrivada } from '../../components/FotoPrivada'
import type { VisitWithSales } from '../../lib/types'

function iconoNumerado(numero: number) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#1d4ed8;color:white;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${numero}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

interface Props {
  visitas: VisitWithSales[]
}

export function MapaRuta({ visitas }: Props) {
  const posiciones: [number, number][] = visitas.map((v) => [v.latitude, v.longitude])

  if (visitas.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
        Sin visitas registradas todavía
      </div>
    )
  }

  return (
    <div className="h-80 w-full overflow-hidden rounded-xl">
      <MapContainer center={posiciones[0]} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarLimites posiciones={posiciones} />
        {posiciones.length > 1 && <Polyline positions={posiciones} color="#1d4ed8" weight={3} />}
        {visitas.map((visita, i) => {
          const total = visita.sales.reduce((s, v) => s + Number(v.amount), 0)
          return (
            <Marker key={visita.id} position={[visita.latitude, visita.longitude]} icon={iconoNumerado(i + 1)}>
              <Popup>
                <div className="w-40">
                  <FotoPrivada
                    bucket="visit-photos"
                    path={visita.photo_path}
                    alt="Foto de la tienda"
                    className="mb-2 h-24 w-full rounded object-cover"
                  />
                  <p className="text-sm font-semibold">{visita.store_name || 'Tienda sin nombre'}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(visita.captured_at).toLocaleString('es-GT')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-brand-700">
                    {visita.sales.length} venta{visita.sales.length !== 1 && 's'} · Q{total.toFixed(2)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
