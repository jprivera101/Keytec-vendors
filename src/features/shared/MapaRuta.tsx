import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FotoPrivada } from '../../components/FotoPrivada'
import { formatMonto } from '../../lib/currency'
import type { CountryCode, TiendaConLugar, VisitWithSales } from '../../lib/types'

// Colores de marca, uno por día de la ruta (para distinguir de un vistazo qué visitas
// pasaron el mismo día): azul, amarillo, morado — y se repiten si la semana tiene más días.
const COLORES_DIA = ['#2D77BD', '#FFCE07', '#382E88']

function colorDelDia(indiceDia: number) {
  return COLORES_DIA[indiceDia % COLORES_DIA.length]
}

function iconoNumerado(numero: number, color: string) {
  // El amarillo de marca es muy claro: el número necesita texto oscuro ahí para leerse bien.
  const textoOscuro = color === '#FFCE07'
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:${textoOscuro ? '#382E88' : 'white'};width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${numero}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const iconoTienda = L.divIcon({
  className: '',
  html: `
    <div class="tienda-pin-wrap">
      <svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45))">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18C24 5.373 18.627 0 12 0z" fill="#0092D2" stroke="white" stroke-width="1.3"/>
        <circle cx="12" cy="12" r="8.6" fill="white"/>
        <g stroke="#0092D2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M7 10.2 7.8 6.8A1 1 0 0 1 8.77 6h6.46a1 1 0 0 1 .97.8l.8 3.4"/>
          <path d="M7 10.2a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0 3 0"/>
          <path d="M7.6 10.2V17a.6.6 0 0 0 .6.6h2.3v-3.4h3v3.4h2.3a.6.6 0 0 0 .6-.6v-6.8"/>
        </g>
      </svg>
    </div>
  `,
  iconSize: [24, 30],
  // La punta del pin (no el centro) marca la coordenada exacta, para no tapar la ruta debajo.
  iconAnchor: [12, 30],
  popupAnchor: [0, -26],
})

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
  /** Tiendas ya registradas en la region del vendedor, para comparar contra los pings de las
   * visitas y detectar si alguna quedo marcada lejos de la tienda real. */
  tiendasRegion?: TiendaConLugar[]
  /** Determina si los montos se muestran en Quetzales o en Dólares. */
  country?: CountryCode | null
}

export function MapaRuta({ visitas, tiendasRegion = [], country }: Props) {
  const posicionesVisitas: [number, number][] = visitas.map((v) => [v.latitude, v.longitude])
  const posicionesTiendas: [number, number][] = tiendasRegion.map((t) => [t.latitude, t.longitude])
  const todasLasPosiciones = [...posicionesVisitas, ...posicionesTiendas]

  if (visitas.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
        Sin visitas registradas todavía
      </div>
    )
  }

  // Un "día" es una fecha calendario distinta dentro de las visitas de esta semana; se
  // numeran en orden cronológico (día 1 = la fecha más antigua) para pintar cada uno con
  // su propio color de marca.
  const fechasOrdenadas = Array.from(new Set(visitas.map((v) => v.captured_at.slice(0, 10)))).sort()
  const indiceDia = (visita: VisitWithSales) => fechasOrdenadas.indexOf(visita.captured_at.slice(0, 10))

  const visitasPorDia = new Map<string, VisitWithSales[]>()
  for (const visita of visitas) {
    const fecha = visita.captured_at.slice(0, 10)
    if (!visitasPorDia.has(fecha)) visitasPorDia.set(fecha, [])
    visitasPorDia.get(fecha)!.push(visita)
  }

  return (
    <div>
      <div className="h-80 w-full overflow-hidden rounded-xl">
        <MapContainer center={posicionesVisitas[0]} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AjustarLimites posiciones={todasLasPosiciones} />
          {fechasOrdenadas.map((fecha, i) => {
            const puntos = visitasPorDia.get(fecha)!.map((v) => [v.latitude, v.longitude] as [number, number])
            return (
              puntos.length > 1 && <Polyline key={fecha} positions={puntos} color={colorDelDia(i)} weight={3} />
            )
          })}
          {tiendasRegion.map((tienda) => (
            <Marker
              key={tienda.id}
              position={[tienda.latitude, tienda.longitude]}
              icon={iconoTienda}
              zIndexOffset={10000}
            >
              <Popup>
                <div className="w-40">
                  {tienda.photo_path ? (
                    <FotoPrivada
                      bucket="visit-photos"
                      path={tienda.photo_path}
                      alt={tienda.name}
                      className="mb-2 h-24 w-full rounded object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex h-24 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                      Sin foto
                    </div>
                  )}
                  <p className="text-sm font-semibold">
                    {tienda.placeName ? `${tienda.placeName} · ${tienda.name}` : tienda.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tienda.latitude.toFixed(5)}, {tienda.longitude.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
          {visitas.map((visita, i) => {
            const total = visita.sales.reduce((s, v) => s + Number(v.amount), 0)
            return (
              <Marker
                key={visita.id}
                position={[visita.latitude, visita.longitude]}
                icon={iconoNumerado(i + 1, colorDelDia(indiceDia(visita)))}
              >
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
                      {visita.sales.length} venta{visita.sales.length !== 1 && 's'} · {formatMonto(total, country)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {fechasOrdenadas.map((fecha, i) => (
          <span key={fecha} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: colorDelDia(i) }}
            />
            Día {i + 1} · {new Date(`${fecha}T00:00:00`).toLocaleDateString('es-GT', {
              day: '2-digit',
              month: '2-digit',
            })}
          </span>
        ))}
        {tiendasRegion.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-[#0092D2]" /> Tienda de la región
          </span>
        )}
      </p>
    </div>
  )
}
