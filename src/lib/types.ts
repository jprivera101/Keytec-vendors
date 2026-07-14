export type UserRole = 'super_admin' | 'admin' | 'salesman' | 'operario'
export type WeekStatus = 'active' | 'completed'
export type CountryCode = 'GT' | 'SV'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  active: boolean
  country: CountryCode | null
  route_id: string | null
  created_at: string
}

export interface Region {
  id: string
  country: CountryCode
  name: string
  created_at: string
}

export interface VendedorConRegion extends Profile {
  region_name: string | null
}

export interface Week {
  id: string
  salesman_id: string
  start_date: string
  end_date: string | null
  start_mileage_km: number
  end_mileage_km: number | null
  start_mileage_photo_path: string | null
  end_mileage_photo_path: string | null
  status: WeekStatus
  started_at: string
  ended_at: string | null
}

export interface Place {
  id: string
  country: CountryCode
  name: string
  created_by: string | null
  created_at: string
}

export interface Store {
  id: string
  place_id: string
  country: CountryCode
  name: string
  latitude: number
  longitude: number
  created_by: string | null
  route_id: string | null
  /** Foto tomada en la primera visita (cuando se registro la tienda); nunca cambia despues. */
  photo_path: string | null
  created_at: string
}

export interface Visit {
  id: string
  week_id: string
  store_id: string | null
  store_name: string | null
  photo_path: string
  latitude: number
  longitude: number
  notes: string | null
  captured_at: string
}

export interface Sale {
  id: string
  visit_id: string
  amount: number
  photo_path: string | null
  created_at: string
  processed: boolean
  processed_at: string | null
  processed_by: string | null
}

export interface VisitWithSales extends Visit {
  sales: Sale[]
}

/** Visita combinada con el vendedor que la registró — usada en la vista general de
 * Analítica, donde se muestran varios vendedores juntos en un solo mapa. */
export interface VisitaConVendedor extends VisitWithSales {
  vendedorId: string
  vendedorNombre: string
}

export interface GasolinaRegistro {
  id: string
  week_id: string
  initial_tank_photo_path: string
  final_tank_photo_path: string
  receipt_photo_path: string
  amount: number
  created_at: string
}

/** Venta que no quedo ligada a ninguna tienda/ubicacion (p.ej. se vendio ya cerrada la
 * semana y se registra al iniciar la siguiente). */
export interface VentaEnvio {
  id: string
  week_id: string
  client_name: string
  amount: number
  photo_path: string | null
  created_at: string
}

export interface ResumenAdmin {
  vendedoresActivos: number
  rutasActivas: number
  visitasEnRuta: number
  /** Total vendido por país (nunca se suman Quetzales con Dólares). */
  ventasEnRutaPorPais: Partial<Record<CountryCode, number>>
  ventasPorVendedor: { nombre: string; total: number; country: CountryCode | null }[]
}

export interface TiendaConLugar extends Store {
  placeName: string | null
}

export interface TiendaConEstadisticas extends Store {
  placeName: string | null
  regionName: string | null
  totalVisitas: number
  totalVentas: number
  ultimaVisita: string | null
}
