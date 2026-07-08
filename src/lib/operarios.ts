import { supabase } from './supabaseClient'
import type { CountryCode, Profile } from './types'

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

export interface VentaOperario {
  id: string
  amount: number
  photoPath: string | null
  createdAt: string
  processed: boolean
  storeName: string | null
  salesmanId: string
  salesmanName: string
  country: CountryCode | null
}

interface FilaVentaOperario {
  id: string
  amount: number
  photo_path: string | null
  created_at: string
  processed: boolean
  visits: {
    store_name: string | null
    weeks: {
      salesman_id: string
      profiles: { full_name: string; country: CountryCode | null } | null
    } | null
  } | null
}

/** Todas las ventas visibles para el operario actual (la RLS ya las limita a sus vendedores
 * asignados); el filtrado por vendedor/fecha/estado se hace en el cliente. */
export async function obtenerVentasOperario(): Promise<VentaOperario[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, amount, photo_path, created_at, processed, visits(store_name, weeks(salesman_id, profiles(full_name, country)))',
    )
    .order('created_at', { ascending: false })
  if (error) throw error

  return ((data ?? []) as unknown as FilaVentaOperario[]).flatMap((fila) => {
    const semana = fila.visits?.weeks
    if (!semana) return []
    return [
      {
        id: fila.id,
        amount: Number(fila.amount),
        photoPath: fila.photo_path,
        createdAt: fila.created_at,
        processed: fila.processed,
        storeName: fila.visits?.store_name ?? null,
        salesmanId: semana.salesman_id,
        salesmanName: semana.profiles?.full_name ?? 'Vendedor',
        country: semana.profiles?.country ?? null,
      },
    ]
  })
}

export async function marcarVentaProcesada(
  saleId: string,
  procesada: boolean,
  operarioId: string,
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .update({
      processed: procesada,
      processed_at: procesada ? new Date().toISOString() : null,
      processed_by: procesada ? operarioId : null,
    })
    .eq('id', saleId)
  if (error) throw error
}
