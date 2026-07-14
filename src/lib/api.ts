import { supabase } from './supabaseClient'
import type {
  CountryCode,
  GasolinaRegistro,
  Profile,
  ResumenAdmin,
  Sale,
  VentaEnvio,
  Visit,
  VisitWithSales,
  VendedorConRegion,
  Week,
} from './types'

// Semanas ------------------------------------------------------------

export async function obtenerSemanaActiva(salesmanId: string): Promise<Week | null> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('salesman_id', salesmanId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function crearSemana(
  salesmanId: string,
  startMileageKm: number,
  startMileagePhotoPath: string,
): Promise<Week> {
  const { data, error } = await supabase
    .from('weeks')
    .insert({
      salesman_id: salesmanId,
      start_mileage_km: startMileageKm,
      start_mileage_photo_path: startMileagePhotoPath,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function finalizarSemana(
  weekId: string,
  endMileageKm: number,
  endMileagePhotoPath: string,
): Promise<void> {
  const { error } = await supabase
    .from('weeks')
    .update({
      end_mileage_km: endMileageKm,
      end_mileage_photo_path: endMileagePhotoPath,
      status: 'completed',
      end_date: new Date().toISOString().slice(0, 10),
      ended_at: new Date().toISOString(),
    })
    .eq('id', weekId)
  if (error) throw error
}

export async function obtenerHistorialSemanas(salesmanId: string): Promise<Week[]> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('salesman_id', salesmanId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerSemanaPorId(weekId: string): Promise<Week> {
  const { data, error } = await supabase.from('weeks').select('*').eq('id', weekId).single()
  if (error) throw error
  return data
}

// Visitas y ventas -----------------------------------------------------

export async function crearVisita(input: {
  week_id: string
  store_id: string
  store_name: string | null
  photo_path: string
  latitude: number
  longitude: number
  notes: string | null
}): Promise<Visit> {
  const { data, error } = await supabase.from('visits').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function crearVenta(input: {
  visit_id: string
  amount: number
  photo_path: string | null
}): Promise<Sale> {
  const { data, error } = await supabase.from('sales').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function obtenerVisitasConVentas(weekId: string): Promise<VisitWithSales[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*, sales(*)')
    .eq('week_id', weekId)
    .order('captured_at', { ascending: true })
  if (error) throw error
  return data as VisitWithSales[]
}

// Gasolina -------------------------------------------------------------

export async function crearGasolina(input: {
  week_id: string
  initial_tank_photo_path: string
  final_tank_photo_path: string
  receipt_photo_path: string
  amount: number
}): Promise<GasolinaRegistro> {
  const { data, error } = await supabase.from('gasoline_logs').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function obtenerGasolinaDeSemana(weekId: string): Promise<GasolinaRegistro[]> {
  const { data, error } = await supabase
    .from('gasoline_logs')
    .select('*')
    .eq('week_id', weekId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Ventas por envío (sin tienda/ubicación) ------------------------------

export async function crearVentaEnvio(input: {
  week_id: string
  client_name: string
  amount: number
  photo_path: string | null
}): Promise<VentaEnvio> {
  const { data, error } = await supabase.from('shipment_sales').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function obtenerVentasEnvioDeSemana(weekId: string): Promise<VentaEnvio[]> {
  const { data, error } = await supabase
    .from('shipment_sales')
    .select('*')
    .eq('week_id', weekId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Administracion ---------------------------------------------------

export async function obtenerVendedores(
  pais: CountryCode | 'ALL' = 'ALL',
  region: string | 'ALL' = 'ALL',
): Promise<VendedorConRegion[]> {
  let query = supabase.from('profiles').select('*, routes(name)').eq('role', 'salesman')
  if (pais !== 'ALL') query = query.eq('country', pais)
  if (region !== 'ALL') query = query.eq('route_id', region)
  const { data, error } = await query
    .order('active', { ascending: false })
    .order('full_name', { ascending: true })
  if (error) throw error
  return (data ?? []).map((vendedor) => {
    const { routes, ...resto } = vendedor as typeof vendedor & { routes: { name: string } | null }
    return { ...resto, region_name: routes?.name ?? null }
  })
}

export async function obtenerAdmins(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

export async function obtenerSemanasDeVendedor(salesmanId: string): Promise<Week[]> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('salesman_id', salesmanId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

export async function actualizarVendedor(
  id: string,
  input: { full_name: string; phone: string | null; route_id?: string },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(input).eq('id', id)
  if (error) throw error
}

export async function establecerVendedorActivo(salesmanId: string, active: boolean) {
  const { data, error } = await supabase.functions.invoke('set-salesman-active', {
    body: { salesman_id: salesmanId, active },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

/** Totales para el dashboard: rutas activas = semanas en curso ahora mismo. */
export async function obtenerResumenAdmin(
  pais: CountryCode | 'ALL' = 'ALL',
  region: string | 'ALL' = 'ALL',
): Promise<ResumenAdmin> {
  let vendedoresQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'salesman')
    .eq('active', true)
  if (pais !== 'ALL') vendedoresQuery = vendedoresQuery.eq('country', pais)
  if (region !== 'ALL') vendedoresQuery = vendedoresQuery.eq('route_id', region)
  const { count: vendedoresActivos } = await vendedoresQuery

  let semanasQuery = supabase
    .from('weeks')
    .select('id, salesman_id, profiles!inner(full_name, country, route_id)')
    .eq('status', 'active')
  if (pais !== 'ALL') semanasQuery = semanasQuery.eq('profiles.country', pais)
  if (region !== 'ALL') semanasQuery = semanasQuery.eq('profiles.route_id', region)
  const { data: semanasActivas, error: semanasError } = await semanasQuery
  if (semanasError) throw semanasError

  const rutasActivas = semanasActivas?.length ?? 0
  const base: ResumenAdmin = {
    vendedoresActivos: vendedoresActivos ?? 0,
    rutasActivas,
    visitasEnRuta: 0,
    ventasEnRutaPorPais: {},
    ventasPorVendedor: [],
  }
  if (rutasActivas === 0) return base

  const weekIdASalesman = new Map<string, string>()
  const nombrePorWeekId = new Map<string, string>()
  const paisPorWeekId = new Map<string, CountryCode>()
  for (const semana of semanasActivas ?? []) {
    weekIdASalesman.set(semana.id, semana.salesman_id)
    const perfil = (semana as unknown as { profiles: { full_name: string; country: CountryCode } | null })
      .profiles
    nombrePorWeekId.set(semana.id, perfil?.full_name ?? 'Vendedor')
    if (perfil?.country) paisPorWeekId.set(semana.id, perfil.country)
  }

  const weekIds = Array.from(weekIdASalesman.keys())
  const { data: visitas, error: visitasError } = await supabase
    .from('visits')
    .select('id, week_id')
    .in('week_id', weekIds)
  if (visitasError) throw visitasError

  const visitIdAWeekId = new Map<string, string>()
  for (const visita of visitas ?? []) visitIdAWeekId.set(visita.id, visita.week_id)

  const visitIds = Array.from(visitIdAWeekId.keys())
  const ventasPorNombre = new Map<string, number>()
  const ventasEnRutaPorPais: Partial<Record<CountryCode, number>> = {}

  if (visitIds.length > 0) {
    const { data: ventas, error: ventasError } = await supabase
      .from('sales')
      .select('amount, visit_id')
      .in('visit_id', visitIds)
    if (ventasError) throw ventasError

    for (const venta of ventas ?? []) {
      const weekId = visitIdAWeekId.get(venta.visit_id)
      const nombre = weekId ? (nombrePorWeekId.get(weekId) ?? 'Vendedor') : 'Vendedor'
      ventasPorNombre.set(nombre, (ventasPorNombre.get(nombre) ?? 0) + Number(venta.amount))
      const pais = weekId ? paisPorWeekId.get(weekId) : undefined
      if (pais) ventasEnRutaPorPais[pais] = (ventasEnRutaPorPais[pais] ?? 0) + Number(venta.amount)
    }
  }

  // Las ventas por envío no tienen visita/tienda, pero si cuentan para el total de la ruta.
  const { data: ventasEnvio, error: ventasEnvioError } = await supabase
    .from('shipment_sales')
    .select('amount, week_id')
    .in('week_id', weekIds)
  if (ventasEnvioError) throw ventasEnvioError

  for (const venta of ventasEnvio ?? []) {
    const nombre = nombrePorWeekId.get(venta.week_id) ?? 'Vendedor'
    ventasPorNombre.set(nombre, (ventasPorNombre.get(nombre) ?? 0) + Number(venta.amount))
    const pais = paisPorWeekId.get(venta.week_id)
    if (pais) ventasEnRutaPorPais[pais] = (ventasEnRutaPorPais[pais] ?? 0) + Number(venta.amount)
  }

  const paisPorNombre = new Map<string, CountryCode | null>()
  for (const semana of semanasActivas ?? []) {
    const perfil = (semana as unknown as { profiles: { full_name: string; country: CountryCode } | null })
      .profiles
    if (perfil) paisPorNombre.set(perfil.full_name, perfil.country ?? null)
  }

  return {
    ...base,
    visitasEnRuta: visitas?.length ?? 0,
    ventasEnRutaPorPais,
    ventasPorVendedor: Array.from(ventasPorNombre, ([nombre, total]) => ({
      nombre,
      total,
      country: paisPorNombre.get(nombre) ?? null,
    })).sort((a, b) => b.total - a.total),
  }
}
