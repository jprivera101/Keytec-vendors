import { supabase } from './supabaseClient'
import type {
  CountryCode,
  Deposito,
  GasolinaRegistro,
  ParkingSpot,
  Profile,
  ResumenAdmin,
  Sale,
  VentaEnvio,
  Visit,
  VisitaConVendedor,
  VisitWithSales,
  VendedorConRegion,
  Week,
} from './types'

// Autenticacion por username -------------------------------------------

/** Traduce un username al correo real (lo que Supabase Auth necesita para iniciar sesion),
 * via una funcion de base de datos callable de forma anonima. Devuelve null si no existe. */
export async function resolverEmailDeUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolver_email_de_username', {
    nombre_usuario: username,
  })
  if (error) throw error
  return data
}

/** El indice unico de profiles.username usa el codigo estandar de Postgres para violacion de
 * unicidad (23505); esto evita mostrar un error crudo de base de datos en el formulario. */
export function esUsernameDuplicado(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null
  return err?.code === '23505' || !!err?.message?.toLowerCase().includes('duplicate key')
}

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

/** Visitas de la semana ACTIVA de cada vendedor dado, para la vista general de Analítica
 * (varios vendedores juntos en un solo mapa). Usa un inner join a "weeks" para poder filtrar
 * por su estado y su vendedor directamente en la consulta. */
export async function obtenerVisitasActivasDeVendedores(
  vendedorIds: string[],
): Promise<VisitaConVendedor[]> {
  if (vendedorIds.length === 0) return []
  const { data, error } = await supabase
    .from('visits')
    .select('*, sales(*), weeks!inner(status, salesman_id, profiles(full_name))')
    .eq('weeks.status', 'active')
    .in('weeks.salesman_id', vendedorIds)
    .order('captured_at', { ascending: true })
  if (error) throw error

  return ((data ?? []) as unknown as Array<
    VisitWithSales & { weeks: { salesman_id: string; profiles: { full_name: string } | null } }
  >).map((fila) => ({
    ...fila,
    vendedorId: fila.weeks.salesman_id,
    vendedorNombre: fila.weeks.profiles?.full_name ?? 'Vendedor',
  }))
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

// Depositos --------------------------------------------------------------

export async function crearDeposito(salesmanId: string, photoPath: string): Promise<Deposito> {
  const { data, error } = await supabase
    .from('deposits')
    .insert({ salesman_id: salesmanId, photo_path: photoPath })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Depósitos de un vendedor en un rango de fechas (usado tanto para el resumen semanal del
 * propio vendedor como, filtrado por varios ids, para la vista de administración). */
export async function obtenerDepositosDeVendedorEnRango(
  salesmanId: string,
  desde: string,
  hasta: string,
): Promise<Deposito[]> {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('salesman_id', salesmanId)
    .gte('created_at', desde)
    .lt('created_at', hasta)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerDepositosDeVendedoresEnRango(
  salesmanIds: string[],
  desde: string,
  hasta: string,
): Promise<Deposito[]> {
  if (salesmanIds.length === 0) return []
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .in('salesman_id', salesmanIds)
    .gte('created_at', desde)
    .lt('created_at', hasta)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Parqueo ------------------------------------------------------------

export async function obtenerParqueoAbierto(salesmanId: string): Promise<ParkingSpot | null> {
  const { data, error } = await supabase
    .from('parking_spots')
    .select('*')
    .eq('salesman_id', salesmanId)
    .is('ended_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function crearParqueo(input: {
  week_id: string
  salesman_id: string
  latitude: number
  longitude: number
  car_photo_path: string
}): Promise<ParkingSpot> {
  const { data, error } = await supabase.from('parking_spots').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function cerrarParqueo(id: string, receiptPhotoPath: string): Promise<ParkingSpot> {
  const { data, error } = await supabase
    .from('parking_spots')
    .update({ receipt_photo_path: receiptPhotoPath, ended_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function obtenerParqueosDeSemana(weekId: string): Promise<ParkingSpot[]> {
  const { data, error } = await supabase
    .from('parking_spots')
    .select('*')
    .eq('week_id', weekId)
    .order('started_at', { ascending: true })
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
  input: {
    full_name: string
    phone: string | null
    route_id?: string
    km_per_gallon?: number | null
    username?: string
  },
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

/** Cambia la contraseña de un vendedor, admin de país u operario; esto cierra su sesión
 * en todos sus dispositivos automáticamente (Supabase revoca sus tokens al hacerlo). */
export async function restablecerPassword(userId: string, newPassword: string) {
  const { data, error } = await supabase.functions.invoke('reset-password', {
    body: { user_id: userId, new_password: newPassword },
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
