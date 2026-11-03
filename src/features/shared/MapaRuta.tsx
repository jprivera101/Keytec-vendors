import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FotoPrivada } from '../../components/FotoPrivada'
import { formatMonto } from '../../lib/currency'
import { fechaLocalISO } from '../../lib/fechas'
import { IconContraer, IconExpandir } from '../../components/icons'
import type { CountryCode, ParkingSpot, TiendaConLugar, VisitWithSales } from '../../lib/types'

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

// Pin de parqueo: globo naranja con circulo blanco y una "P" oscura, igual al icono de
// referencia que se usa para marcar zonas de parqueo publico.
const iconoParqueo = L.divIcon({
  className: '',
  html: `
    <div style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45))">
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.82 20.18 0 13 0z" fill="#EA5A33" stroke="white" stroke-width="1.3"/>
        <circle cx="13" cy="13" r="9.3" fill="#EEF2F3"/>
        <text x="13" y="18" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0D2A3E">P</text>
      </svg>
    </div>
  `,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
})

function formatearDuracion(inicioIso: string, finIso: string | null) {
  const inicio = new Date(inicioIso).getTime()
  const fin = finIso ? new Date(finIso).getTime() : Date.now()
  const minutosTotales = Math.max(0, Math.round((fin - inicio) / 60000))
  const horas = Math.floor(minutosTotales / 60)
  const minutos = minutosTotales % 60
  const duracion = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`
  return finIso ? duracion : `${duracion} (aún parqueado)`
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

/** Leaflet no detecta por si solo que su contenedor cambio de tamaño (p.ej. al pasar a
 * pantalla completa), asi que hay que avisarle explicitamente o el mapa queda recortado /
 * mal centrado hasta el siguiente pan o zoom manual. */
function InvalidarAlCambiarTamano({ activo }: { activo: boolean }) {
  const map = useMap()
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(id)
  }, [map, activo])
  return null
}

interface Grupo {
  fecha: string
  color: string
  etiqueta: string
  visitas: VisitWithSales[]
}

interface Props {
  visitas: VisitWithSales[]
  /** Tiendas ya registradas en la region del vendedor, para comparar contra los pings de las
   * visitas y detectar si alguna quedo marcada lejos de la tienda real. */
  tiendasRegion?: TiendaConLugar[]
  /** Determina si los montos se muestran en Quetzales o en Dólares. */
  country?: CountryCode | null
  /** Clase de altura del contenedor del mapa (Tailwind, p. ej. 'h-48'). Por defecto 'h-80'; el
   * vendedor en su celular pasa una más baja para que el mapa no ocupe toda la pantalla. */
  alturaClase?: string
  /** Parqueos marcados durante la semana; se muestran solo como pines (sin lista aparte). */
  parkingSpots?: ParkingSpot[]
  /** Alto máximo (px) del contenido de cada popup antes de volverse scrolleable. Por
   * defecto pensado para el mapa grande (h-80); el mapa chico del vendedor pasa uno menor
   * para que el popup completo quepa dentro del contenedor (que recorta lo que se sale). */
  popupMaxHeight?: number
}

export function MapaRuta({
  visitas,
  tiendasRegion = [],
  country,
  alturaClase = 'h-80',
  parkingSpots = [],
  popupMaxHeight = 220,
}: Props) {
  const [pantallaCompleta, setPantallaCompleta] = useState(false)
  // Fecha (YYYY-MM-DD local) del día elegido en la leyenda: el mapa muestra solo la ruta de ese
  // día. null = toda la semana. Tocar el mismo día otra vez lo deselecciona.
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)

  useEffect(() => {
    if (!pantallaCompleta) return
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setPantallaCompleta(false)
    }
    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [pantallaCompleta])

  if (visitas.length === 0 && parkingSpots.length === 0) {
    return (
      <div className={`flex ${alturaClase} items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400`}>
        Sin visitas registradas todavía
      </div>
    )
  }

  // Un "día" es una fecha calendario LOCAL distinta dentro de las visitas de esta semana (no
  // UTC: captured_at.slice(0, 10) corría un día adelantado desde las 6pm hasta medianoche en
  // Guatemala/El Salvador). Se numeran en orden cronológico (día 1 = la fecha más antigua)
  // para pintar cada uno con su propio color de marca.
  const fechasOrdenadas = Array.from(new Set(visitas.map((v) => fechaLocalISO(v.captured_at)))).sort()
  const indiceDia = (visita: VisitWithSales) => fechasOrdenadas.indexOf(fechaLocalISO(visita.captured_at))
  const visitasPorDia = new Map<string, VisitWithSales[]>()
  for (const visita of visitas) {
    const fecha = fechaLocalISO(visita.captured_at)
    if (!visitasPorDia.has(fecha)) visitasPorDia.set(fecha, [])
    visitasPorDia.get(fecha)!.push(visita)
  }

  // Si el día elegido ya no existe (p.ej. cambió la semana mostrada), se vuelve a la semana completa.
  const diaActivo = diaSeleccionado && visitasPorDia.has(diaSeleccionado) ? diaSeleccionado : null
  const visitasVisibles = diaActivo ? visitasPorDia.get(diaActivo)! : visitas
  const parqueosVisibles = diaActivo
    ? parkingSpots.filter((p) => fechaLocalISO(p.started_at) === diaActivo)
    : parkingSpots

  // Con un día elegido se encuadra solo su ruta (sin las tiendas de la región, que harían que
  // el zoom casi no cambie); con la semana completa, todo como antes.
  const posicionesVisitas: [number, number][] = visitasVisibles.map((v) => [v.latitude, v.longitude])
  const posicionesTiendas: [number, number][] = tiendasRegion.map((t) => [t.latitude, t.longitude])
  const posicionesParqueo: [number, number][] = parqueosVisibles.map((p) => [p.latitude, p.longitude])
  const todasLasPosiciones = diaActivo
    ? [...posicionesVisitas, ...posicionesParqueo]
    : [...posicionesVisitas, ...posicionesTiendas, ...posicionesParqueo]

  // La leyenda: un color por día. La ruta completa de la semana se numera de forma continua
  // (1..N) y se dibuja como una sola línea conectada, aunque el color de cada tramo cambie
  // según el día en el que cae el punto de llegada (para marcar dónde empieza un día nuevo
  // sin cortar la ruta).
  const gruposFinal: Grupo[] = fechasOrdenadas.map((fecha, i) => ({
    fecha,
    color: colorDelDia(i),
    etiqueta: `Día ${i + 1} · ${new Date(`${fecha}T00:00:00`).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
    })}`,
    visitas: visitasPorDia.get(fecha)!,
  }))

  // Con un día elegido, la numeración arranca en 1 para ese día (su propia ruta).
  const visitasOrdenadas = [...visitasVisibles].sort((a, b) => a.captured_at.localeCompare(b.captured_at))
  const colorPorVisitaId = new Map<string, string>()
  const numeroPorVisitaId = new Map<string, number>()
  visitasOrdenadas.forEach((visita, idx) => {
    colorPorVisitaId.set(visita.id, colorDelDia(indiceDia(visita)))
    numeroPorVisitaId.set(visita.id, idx + 1)
  })

  return (
    <div className={pantallaCompleta ? 'fixed inset-0 z-[2000] bg-white p-3' : ''}>
      <div
        className={`relative w-full overflow-hidden rounded-xl ${
          pantallaCompleta ? 'h-[calc(100vh-1.5rem)]' : alturaClase
        }`}
      >
        <button
          type="button"
          onClick={() => setPantallaCompleta((actual) => !actual)}
          aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'}
          title={pantallaCompleta ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'}
          className="absolute right-2.5 top-2.5 z-[1000] flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-md hover:text-slate-900"
        >
          {pantallaCompleta ? <IconContraer width={16} height={16} /> : <IconExpandir width={16} height={16} />}
        </button>
        <MapContainer
          center={posicionesVisitas[0] ?? todasLasPosiciones[0]}
          zoom={13}
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
          <InvalidarAlCambiarTamano activo={pantallaCompleta} />
          {visitasOrdenadas.slice(1).map((visita, i) => (
            <Polyline
              key={visita.id}
              positions={[
                [visitasOrdenadas[i].latitude, visitasOrdenadas[i].longitude],
                [visita.latitude, visita.longitude],
              ]}
              color={colorPorVisitaId.get(visita.id)}
              weight={3}
            />
          ))}
          {tiendasRegion.map((tienda) => (
            <Marker
              key={tienda.id}
              position={[tienda.latitude, tienda.longitude]}
              icon={iconoTienda}
              zIndexOffset={10000}
            >
              <Popup maxHeight={popupMaxHeight}>
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
          {visitasVisibles.map((visita) => {
            const total = visita.sales.filter((v) => !v.cancelled).reduce((s, v) => s + Number(v.amount), 0)
            return (
              <Marker
                key={visita.id}
                position={[visita.latitude, visita.longitude]}
                icon={iconoNumerado(numeroPorVisitaId.get(visita.id) ?? 1, colorPorVisitaId.get(visita.id) ?? colorDelDia(0))}
              >
                <Popup maxHeight={popupMaxHeight}>
                  <div className="w-40">
                    <FotoPrivada
                      bucket="visit-photos"
                      path={visita.photo_path ?? visita.store_photo_path ?? null}
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
          {parqueosVisibles.map((parqueo) => (
            <Marker key={parqueo.id} position={[parqueo.latitude, parqueo.longitude]} icon={iconoParqueo}>
              <Popup maxHeight={popupMaxHeight}>
                <div className="w-40">
                  <FotoPrivada
                    bucket="parking-photos"
                    path={parqueo.car_photo_path}
                    alt="Foto del carro parqueado"
                    className="mb-2 h-24 w-full rounded object-cover"
                  />
                  <p className="text-sm font-semibold">🅿️ Parqueo</p>
                  <p className="text-xs text-slate-500">
                    {new Date(parqueo.started_at).toLocaleString('es-GT')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-brand-700">
                    {formatearDuracion(parqueo.started_at, parqueo.ended_at)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {gruposFinal.map((grupo) => {
          const seleccionado = diaActivo === grupo.fecha
          return (
            <button
              key={grupo.fecha}
              type="button"
              onClick={() => setDiaSeleccionado(seleccionado ? null : grupo.fecha)}
              aria-pressed={seleccionado}
              title={seleccionado ? 'Ver toda la semana' : 'Ver solo la ruta de este día'}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
                seleccionado
                  ? 'bg-slate-900 font-semibold text-white'
                  : diaActivo
                    ? 'opacity-50 hover:bg-slate-100 hover:opacity-100'
                    : 'hover:bg-slate-100'
              }`}
            >
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: grupo.color }} />
              {grupo.etiqueta}
              {seleccionado && <span className="ml-0.5">✕</span>}
            </button>
          )
        })}
        {tiendasRegion.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-[#0092D2]" /> Tienda de la región
          </span>
        )}
        {gruposFinal.length > 1 && !diaActivo && (
          <span className="text-slate-400">Toca un día para ver solo su ruta</span>
        )}
      </p>
    </div>
  )
}
