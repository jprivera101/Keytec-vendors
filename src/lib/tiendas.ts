import { supabase } from './supabaseClient'
import type { CountryCode, Store, TiendaConEstadisticas, TiendaConLugar, VisitWithSales } from './types'

/** Tiendas ya registradas dentro de un lugar especifico (para el desplegable en cascada). */
export async function obtenerTiendasPorLugar(placeId: string): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('place_id', placeId)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function crearTienda(input: {
  place_id: string
  country: CountryCode
  name: string
  latitude: number
  longitude: number
  created_by: string
  /** La foto tomada en esta primera visita: queda fija como la foto de la tienda. */
  photo_path: string
}): Promise<Store> {
  const { data, error } = await supabase.from('stores').insert(input).select('*').single()
  if (error) throw error
  return data
}

/** Tiendas de una region especifica (con el nombre de su lugar), para el mapa de verificacion
 * en Analítica. */
export async function obtenerTiendasPorRegion(regionId: string): Promise<TiendaConLugar[]> {
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*, places(name)')
    .eq('route_id', regionId)
    .order('name', { ascending: true })
  if (error) throw error
  return (stores ?? []).map((store) => {
    const { places, ...resto } = store as typeof store & { places: { name: string } | null }
    return { ...resto, placeName: places?.name ?? null }
  })
}

/** Lista de tiendas del pais (o de todos, si pais es 'ALL'), opcionalmente filtrada por
 * region, con sus totales de visitas/ventas. */
export async function obtenerTiendasConEstadisticas(
  pais: CountryCode | 'ALL',
  region: string | 'ALL' = 'ALL',
): Promise<TiendaConEstadisticas[]> {
  let storesQuery = supabase.from('stores').select('*, places(name), routes(name)')
  if (pais !== 'ALL') storesQuery = storesQuery.eq('country', pais)
  if (region !== 'ALL') storesQuery = storesQuery.eq('route_id', region)
  const { data: stores, error: storesError } = await storesQuery.order('name', { ascending: true })
  if (storesError) throw storesError
  if (!stores || stores.length === 0) return []

  const storeIds = stores.map((s) => s.id)
  const { data: visitas, error: visitasError } = await supabase
    .from('visits')
    .select('id, store_id, captured_at')
    .in('store_id', storeIds)
  if (visitasError) throw visitasError

  const visitIdAStoreId = new Map<string, string>()
  const visitasPorTienda = new Map<string, number>()
  const ultimaVisitaPorTienda = new Map<string, string>()

  for (const visita of visitas ?? []) {
    if (!visita.store_id) continue
    visitIdAStoreId.set(visita.id, visita.store_id)
    visitasPorTienda.set(visita.store_id, (visitasPorTienda.get(visita.store_id) ?? 0) + 1)
    const actual = ultimaVisitaPorTienda.get(visita.store_id)
    if (!actual || visita.captured_at > actual) {
      ultimaVisitaPorTienda.set(visita.store_id, visita.captured_at)
    }
  }

  const visitIds = Array.from(visitIdAStoreId.keys())
  const ventasPorTienda = new Map<string, number>()

  if (visitIds.length > 0) {
    const { data: ventas, error: ventasError } = await supabase
      .from('sales')
      .select('amount, visit_id')
      .in('visit_id', visitIds)
    if (ventasError) throw ventasError

    for (const venta of ventas ?? []) {
      const storeId = visitIdAStoreId.get(venta.visit_id)
      if (!storeId) continue
      ventasPorTienda.set(storeId, (ventasPorTienda.get(storeId) ?? 0) + Number(venta.amount))
    }
  }

  return stores.map((store) => {
    const { places, routes, ...resto } = store as typeof store & {
      places: { name: string } | null
      routes: { name: string } | null
    }
    return {
      ...resto,
      placeName: places?.name ?? null,
      regionName: routes?.name ?? null,
      totalVisitas: visitasPorTienda.get(store.id) ?? 0,
      totalVentas: ventasPorTienda.get(store.id) ?? 0,
      ultimaVisita: ultimaVisitaPorTienda.get(store.id) ?? null,
    }
  })
}

export async function obtenerTiendaPorId(storeId: string): Promise<Store> {
  const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).single()
  if (error) throw error
  return data
}

/** Historial de visitas de una tienda especifica, sin importar la semana/vendedor. */
export async function obtenerVisitasDeTienda(storeId: string): Promise<VisitWithSales[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*, sales(*)')
    .eq('store_id', storeId)
    .order('captured_at', { ascending: false })
  if (error) throw error
  return data as VisitWithSales[]
}
