import { supabase } from './supabaseClient'
import type { Profile, Sale, Visit, VisitWithSales, Week } from './types'

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

export async function crearSemana(salesmanId: string, startMileageKm: number): Promise<Week> {
  const { data, error } = await supabase
    .from('weeks')
    .insert({ salesman_id: salesmanId, start_mileage_km: startMileageKm })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function finalizarSemana(weekId: string, endMileageKm: number): Promise<void> {
  const { error } = await supabase
    .from('weeks')
    .update({
      end_mileage_km: endMileageKm,
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

// Administracion ---------------------------------------------------

export async function obtenerVendedores(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'salesman')
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
