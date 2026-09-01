import { supabase } from './supabaseClient'
import { fechaLocalISO, fechaDesdeISO } from './fechas'
import type { CountryCode, Profile, WeekStatus } from './types'

export interface OperarioConAsignados extends Profile {
  asignados: number
}

export async function obtenerOperarios(): Promise<OperarioConAsignados[]> {
  const { data: operarios, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'operario')
    .order('full_name', { ascending: true })
  if (error) throw error
  if (!operarios || operarios.length === 0) return []

  const { data: asignaciones, error: asignError } = await supabase
    .from('operario_asignaciones')
    .select('operario_id')
    .in(
      'operario_id',
      operarios.map((o) => o.id),
    )
  if (asignError) throw asignError

  const conteo = new Map<string, number>()
  for (const fila of asignaciones ?? []) {
    conteo.set(fila.operario_id, (conteo.get(fila.operario_id) ?? 0) + 1)
  }
  return operarios.map((o) => ({ ...o, asignados: conteo.get(o.id) ?? 0 }))
}

/** Para cada vendedor, el/los operario(s) que tiene asignados (por nombre) — usado en la
 * columna "Operario" de Vendedores. Dos consultas (en vez de un embed anidado) porque
 * "operario_asignaciones" tiene dos FKs a "profiles" (operario_id y salesman_id), lo que
 * vuelve ambiguo cualquier embed directo de "profiles" sobre esa tabla. */
export async function obtenerOperariosPorVendedor(): Promise<Map<string, string[]>> {
  const { data: asignaciones, error } = await supabase
    .from('operario_asignaciones')
    .select('operario_id, salesman_id')
  if (error) throw error
  if (!asignaciones || asignaciones.length === 0) return new Map()

  const operarioIds = Array.from(new Set(asignaciones.map((a) => a.operario_id)))
  const { data: operarios, error: operariosError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', operarioIds)
  if (operariosError) throw operariosError

  const nombrePorOperarioId = new Map((operarios ?? []).map((o) => [o.id, o.full_name]))
  const mapa = new Map<string, string[]>()
  for (const asignacion of asignaciones) {
    const nombre = nombrePorOperarioId.get(asignacion.operario_id) ?? 'Operario'
    if (!mapa.has(asignacion.salesman_id)) mapa.set(asignacion.salesman_id, [])
    mapa.get(asignacion.salesman_id)!.push(nombre)
  }
  return mapa
}

export async function obtenerAsignacionesDeOperario(operarioId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('operario_asignaciones')
    .select('salesman_id')
    .eq('operario_id', operarioId)
  if (error) throw error
  return (data ?? []).map((fila) => fila.salesman_id)
}

/** Reemplaza por completo la lista de vendedores asignados a un operario. */
export async function establecerAsignaciones(operarioId: string, salesmanIds: string[]): Promise<void> {
  const { error: delError } = await supabase
    .from('operario_asignaciones')
    .delete()
    .eq('operario_id', operarioId)
  if (delError) throw delError
  if (salesmanIds.length === 0) return
  const { error: insError } = await supabase
    .from('operario_asignaciones')
    .insert(salesmanIds.map((salesman_id) => ({ operario_id: operarioId, salesman_id })))
  if (insError) throw insError
}

export async function obtenerVendedoresAsignados(operarioId: string): Promise<Profile[]> {
  const ids = await obtenerAsignacionesDeOperario(operarioId)
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids)
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

// Ventas para procesar --------------------------------------------------

/** `origen` distingue de qué tabla viene (sales vs shipment_sales): marcarVentaProcesada
 * necesita saberlo para actualizar la tabla correcta. */
export interface VentaOperario {
  id: string
  origen: 'venta' | 'envio'
  amount: number
  photoPath: string | null
  createdAt: string
  processed: boolean
  /** Cuándo se marcó como procesada (null si sigue pendiente). */
  processedAt: string | null
  storeId: string | null
  storeName: string | null
  /** Nombre del cliente/dueño de la tienda (null en ventas por envío, que no tienen tienda). */
  clientName: string | null
  salesmanId: string
  salesmanName: string
  country: CountryCode | null
  weekId: string
  weekStatus: WeekStatus
}

interface FilaVentaOperario {
  id: string
  amount: number
  photo_path: string | null
  created_at: string
  processed: boolean
  processed_at: string | null
  visits: {
    store_id: string | null
    store_name: string | null
    stores: { client_name: string | null } | null
    weeks: {
      id: string
      status: WeekStatus
      salesman_id: string
      profiles: { full_name: string; country: CountryCode | null } | null
    } | null
  } | null
}

interface FilaEnvioOperario {
  id: string
  amount: number
  photo_path: string | null
  created_at: string
  processed: boolean
  processed_at: string | null
  client_name: string
  weeks: {
    id: string
    status: WeekStatus
    salesman_id: string
    profiles: { full_name: string; country: CountryCode | null } | null
  } | null
}

/** Todas las ventas visibles para el operario actual (la RLS ya las limita a sus vendedores
 * asignados); el filtrado por vendedor/semana/estado se hace en el cliente. Se filtra por
 * semana activa vs. anteriores en vez de "hoy" (fecha) porque comparar fechas de calendario
 * cerca de medianoche en la zona horaria local resultó frágil y confuso.
 *
 * Incluye tanto "sales" (ligadas a una visita/tienda) como "shipment_sales" (ventas por
 * envío, sin tienda): antes solo se traían las primeras, así que una venta por envío nunca
 * le aparecía al operario para procesarla en el CRM.
 *
 * `soloPendientes` evita traer el historial completo de ventas ya procesadas cuando el
 * operario mira "Anteriores"/"Todas" -- ahí solo le interesa lo que todavía le falta
 * procesar, no volver a bajar meses de ventas ya cerradas cada vez que abre el panel. */
const SELECT_VENTA =
  'id, amount, photo_path, created_at, processed, processed_at, visits(store_id, store_name, stores(client_name), weeks(id, status, salesman_id, profiles(full_name, country)))'
const SELECT_ENVIO =
  'id, amount, photo_path, created_at, processed, processed_at, client_name, weeks(id, status, salesman_id, profiles(full_name, country))'

function filaVentaAVentaOperario(fila: FilaVentaOperario): VentaOperario | null {
  const semana = fila.visits?.weeks
  if (!semana) return null
  return {
    id: fila.id,
    origen: 'venta',
    amount: Number(fila.amount),
    photoPath: fila.photo_path,
    createdAt: fila.created_at,
    processed: fila.processed,
    processedAt: fila.processed_at,
    storeId: fila.visits?.store_id ?? null,
    storeName: fila.visits?.store_name ?? null,
    clientName: fila.visits?.stores?.client_name ?? null,
    salesmanId: semana.salesman_id,
    salesmanName: semana.profiles?.full_name ?? 'Vendedor',
    country: semana.profiles?.country ?? null,
    weekId: semana.id,
    weekStatus: semana.status,
  }
}

function filaEnvioAVentaOperario(fila: FilaEnvioOperario): VentaOperario | null {
  const semana = fila.weeks
  if (!semana) return null
  return {
    id: fila.id,
    origen: 'envio',
    amount: Number(fila.amount),
    photoPath: fila.photo_path,
    createdAt: fila.created_at,
    processed: fila.processed,
    processedAt: fila.processed_at,
    storeId: null,
    storeName: `📦 ${fila.client_name}`,
    clientName: null,
    salesmanId: semana.salesman_id,
    salesmanName: semana.profiles?.full_name ?? 'Vendedor',
    country: semana.profiles?.country ?? null,
    weekId: semana.id,
    weekStatus: semana.status,
  }
}

export async function obtenerVentasOperario(soloPendientes = false): Promise<VentaOperario[]> {
  // Una venta cancelada no tiene nada que procesar: se excluye siempre, no solo en el filtro
  // de pendientes.
  let ventasQuery = supabase
    .from('sales')
    .select(SELECT_VENTA)
    .eq('cancelled', false)
    .order('created_at', { ascending: false })
  let enviosQuery = supabase
    .from('shipment_sales')
    .select(SELECT_ENVIO)
    .eq('cancelled', false)
    .order('created_at', { ascending: false })

  if (soloPendientes) {
    ventasQuery = ventasQuery.eq('processed', false)
    enviosQuery = enviosQuery.eq('processed', false)
  }

  const [ventasRes, enviosRes] = await Promise.all([ventasQuery, enviosQuery])
  if (ventasRes.error) throw ventasRes.error
  if (enviosRes.error) throw enviosRes.error

  const ventas = ((ventasRes.data ?? []) as unknown as FilaVentaOperario[])
    .map(filaVentaAVentaOperario)
    .filter((v): v is VentaOperario => v !== null)
  const envios = ((enviosRes.data ?? []) as unknown as FilaEnvioOperario[])
    .map(filaEnvioAVentaOperario)
    .filter((v): v is VentaOperario => v !== null)

  return [...ventas, ...envios].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/** Cuántos días le quedan a la foto de una venta antes de que el job de retención (ver
 * retention-cleanup, migración 0039) la borre por completo -- las fotos se comprimen a los 14
 * días (siguen viéndose, solo más chicas) pero se ELIMINAN del todo a los 2 meses. */
const DIAS_ANTES_DE_BORRAR_FOTO = 60
/** Margen de seguridad: el job corre una vez al día, así que el límite exacto de "2 meses" es
 * frágil -- unos días antes evita ofrecer una fecha cuya foto ya se borró (o está por borrarse
 * el mismo día que se genera el reporte). */
const MARGEN_SEGURIDAD_DIAS = 5

/** Rango de fechas seguro para "Revisión de operaciones": nunca antes de cuando la foto más
 * vieja todavía disponible se subió, nunca después de hoy. */
export function obtenerRangoSeguroParaFotos(): { minFecha: string; maxFecha: string } {
  const hoy = new Date()
  const minFecha = fechaLocalISO(
    new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - DIAS_ANTES_DE_BORRAR_FOTO + MARGEN_SEGURIDAD_DIAS),
  )
  return { minFecha, maxFecha: fechaLocalISO(hoy) }
}

/** Ventas (procesadas o pendientes, nunca canceladas) en [desde, hasta] -- para "Revisión de
 * operaciones". A diferencia de obtenerVentasOperario, siempre trae ambos estados: el punto es
 * repasar el historial completo de lo ya operado, no solo lo que falta. El rango se acota del
 * lado del cliente a obtenerRangoSeguroParaFotos para no ofrecer fechas cuya foto el job de
 * retención ya haya borrado. */
export async function obtenerVentasOperarioEnRango(desde: string, hasta: string): Promise<VentaOperario[]> {
  const desdeFecha = fechaDesdeISO(desde)
  const hastaFecha = fechaDesdeISO(hasta)
  const hastaExclusiva = new Date(hastaFecha.getFullYear(), hastaFecha.getMonth(), hastaFecha.getDate() + 1)

  const [ventasRes, enviosRes] = await Promise.all([
    supabase
      .from('sales')
      .select(SELECT_VENTA)
      .eq('cancelled', false)
      .gte('created_at', desdeFecha.toISOString())
      .lt('created_at', hastaExclusiva.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('shipment_sales')
      .select(SELECT_ENVIO)
      .eq('cancelled', false)
      .gte('created_at', desdeFecha.toISOString())
      .lt('created_at', hastaExclusiva.toISOString())
      .order('created_at', { ascending: false }),
  ])
  if (ventasRes.error) throw ventasRes.error
  if (enviosRes.error) throw enviosRes.error

  const ventas = ((ventasRes.data ?? []) as unknown as FilaVentaOperario[])
    .map(filaVentaAVentaOperario)
    .filter((v): v is VentaOperario => v !== null)
  const envios = ((enviosRes.data ?? []) as unknown as FilaEnvioOperario[])
    .map(filaEnvioAVentaOperario)
    .filter((v): v is VentaOperario => v !== null)

  return [...ventas, ...envios].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function marcarVentaProcesada(
  saleId: string,
  procesada: boolean,
  operarioId: string,
  origen: 'venta' | 'envio' = 'venta',
): Promise<void> {
  const { error } = await supabase
    .from(origen === 'envio' ? 'shipment_sales' : 'sales')
    .update({
      processed: procesada,
      processed_at: procesada ? new Date().toISOString() : null,
      processed_by: procesada ? operarioId : null,
    })
    .eq('id', saleId)
  if (error) throw error
}

// Código del negocio ------------------------------------------------------

/** El código que el operario usa para esta tienda en su propio sistema. Vive en su propia
 * tabla (nunca visible para el vendedor, ver 0032_codigo_tienda.sql) — null si todavía nadie
 * lo ha registrado. */
export async function obtenerCodigoTienda(storeId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('store_codes')
    .select('codigo')
    .eq('store_id', storeId)
    .maybeSingle()
  if (error) throw error
  return data?.codigo ?? null
}

/** Códigos ya registrados para varias tiendas a la vez — para mostrarlos en la lista de
 * ventas del operario sin tener que abrir cada una para verlo. */
export async function obtenerCodigosTiendas(storeIds: string[]): Promise<Map<string, string>> {
  if (storeIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('store_codes')
    .select('store_id, codigo')
    .in('store_id', storeIds)
  if (error) throw error
  return new Map((data ?? []).map((fila) => [fila.store_id, fila.codigo]))
}

/** Registra el código la primera vez que un operario lo tiene a mano para esta tienda. Un
 * segundo operario que la atienda después ya lo ve en vez de tener que volver a pedirlo. */
export async function establecerCodigoTienda(
  storeId: string,
  codigo: string,
  operarioId: string,
): Promise<void> {
  const { error } = await supabase
    .from('store_codes')
    .insert({ store_id: storeId, codigo, set_by: operarioId })
  if (error) throw error
}
