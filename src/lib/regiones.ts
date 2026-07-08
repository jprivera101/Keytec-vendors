import { supabase } from './supabaseClient'
import type { CountryCode, Region } from './types'

export async function obtenerRegionesPorPais(pais: CountryCode): Promise<Region[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('country', pais)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function crearRegion(input: { country: CountryCode; name: string }): Promise<Region> {
  const { data, error } = await supabase.from('routes').insert(input).select('*').single()
  if (error) throw error
  return data
}
