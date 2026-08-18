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
  client_name: string
  phone: string | null
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

/** Corrige los datos de una tienda ya existente (nombre, cliente, teléfono). Se usa cuando el
 * vendedor la visita y todavía le falta el nombre del cliente, para ir completando el
 * historial sin necesidad de un flujo aparte. */
export async function actualizarTienda(
  id: string,
  input: { name: string; client_name: string; phone: string | null },
): Promise<Store> {
  const { data, error } = await supabase.from('stores').update(input).eq('id', id).select('*').single()
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

export const TIENDAS_POR_PAGINA = 50

export type CampoOrdenTiendas = 'lugar' | 'visitas' | 'ventas' | 'ultimaVisita'

const COLUMNA_ORDEN: Record<CampoOrdenTiendas, string> = {
  lugar: 'place_name',
  visitas: 'total_visitas',
  ventas: 'total_ventas',
  ultimaVisita: 'ultima_visita',
}

interface FilaTiendaConEstadisticas extends Store {
  place_name: string | null
  region_name: string | null
  total_visitas: number
  total_ventas: number
  ultima_visita: string | null
}

/** Una pagina (50 tiendas) del pais/region elegido, con sus totales de visitas/ventas ya
 * calculados y ordenados en la base de datos. Lee de la vista "stores_con_estadisticas" (ver
 * migración 0044) en vez de traer cada tienda y despues encadenar .in(storeIds) sobre visits y
 * .in(visitIds) sobre sales: esas listas de ids, en produccion, crecen tanto que la consulta
 * fallaba (URL demasiado larga) mucho antes de completar una sola pagina. */
export async function obtenerTiendasConEstadisticas(
  pais: CountryCode | 'ALL',
  region: string | 'ALL' = 'ALL',
  pagina = 0,
  orden: { campo: CampoOrdenTiendas; direccion: 'asc' | 'desc' } = { campo: 'ultimaVisita', direccion: 'desc' },
): Promise<{ tiendas: TiendaConEstadisticas[]; total: number }> {
  let query = supabase.from('stores_con_estadisticas').select('*', { count: 'exact' })
  if (pais !== 'ALL') query = query.eq('country', pais)
  if (region !== 'ALL') query = query.eq('route_id', region)

  const desde = pagina * TIENDAS_POR_PAGINA
  const { data, count, error } = await query
    .order(COLUMNA_ORDEN[orden.campo], { ascending: orden.direccion === 'asc', nullsFirst: false })
    .range(desde, desde + TIENDAS_POR_PAGINA - 1)
  if (error) throw error

  const tiendas = (data as unknown as FilaTiendaConEstadisticas[]).map((fila) => {
    const { place_name, region_name, total_visitas, total_ventas, ultima_visita, ...resto } = fila
    return {
      ...resto,
      placeName: place_name,
      regionName: region_name,
      totalVisitas: total_visitas,
      totalVentas: Number(total_ventas),
      ultimaVisita: ultima_visita,
    }
  })

  return { tiendas, total: count ?? 0 }
}

/** Conteo exacto de tiendas segun el filtro (pais/region), sin traer las filas: a diferencia
 * de obtenerTiendasConEstadisticas, que trae los datos completos y por eso puede toparse con
 * el limite de filas que devuelve Postgrest por defecto, esto siempre refleja el total real. */
export async function obtenerConteoTiendas(
  pais: CountryCode | 'ALL',
  region: string | 'ALL' = 'ALL',
): Promise<number> {
  let query = supabase.from('stores').select('*', { count: 'exact', head: true })
  if (pais !== 'ALL') query = query.eq('country', pais)
  if (region !== 'ALL') query = query.eq('route_id', region)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

/** Desglose del total de tiendas por pais, para cuando el super admin ve "Todos" a la vez.
 * A diferencia de los montos de venta, un conteo de tiendas si se puede sumar entre paises. */
export async function obtenerConteoTiendasPorPais(): Promise<Partial<Record<CountryCode, number>>> {
  const paises: CountryCode[] = ['GT', 'SV']
  const entradas = await Promise.all(paises.map(async (pais) => [pais, await obtenerConteoTiendas(pais)] as const))
  return Object.fromEntries(entradas)
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
