import { supabase } from './supabaseClient'
import type { CountryCode, Place } from './types'

export async function obtenerLugaresPorPais(pais: CountryCode): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('country', pais)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function crearLugar(input: {
  country: CountryCode
  name: string
  created_by: string
}): Promise<Place> {
  const { data, error } = await supabase.from('places').insert(input).select('*').single()
  if (error) throw error
  return data
}
