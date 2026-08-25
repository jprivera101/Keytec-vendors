import { supabase } from './supabaseClient'

export type BucketFotos =
  | 'visit-photos'
  | 'sale-photos'
  | 'mileage-photos'
  | 'gasoline-photos'
  | 'deposit-photos'
  | 'parking-photos'
  | 'daily-tracking-photos'

/** Sube una foto ya comprimida a la carpeta del usuario dentro del bucket indicado. */
export async function subirFoto(bucket: BucketFotos, userId: string, archivo: Blob) {
  const nombre = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(bucket).upload(nombre, archivo, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return nombre
}

// Cachea la URL firmada (no la imagen) por bucket+path. createSignedUrl genera un token nuevo
// en cada llamada, así que sin este cache cada montada de FotoPrivada pedía una URL distinta
// para la misma foto y el navegador nunca podía servirla desde su cache HTTP -- terminaba
// redescargando la imagen completa cada vez que una card se montaba (cada scroll, cada visita
// a la página), disparando el egress de Supabase muy por encima de lo que el tráfico real
// justificaba.
const cacheUrlsFirmadas = new Map<string, { url: string; expiraEn: number }>()

/** Genera (o reutiliza) una URL firmada temporal para mostrar una foto privada. */
export async function obtenerUrlFirmada(bucket: BucketFotos, path: string, segundos = 3600) {
  const clave = `${bucket}/${path}`
  const cacheada = cacheUrlsFirmadas.get(clave)
  const ahora = Date.now()
  if (cacheada && cacheada.expiraEn > ahora) return cacheada.url

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, segundos)
  if (error) throw error
  // Margen de 60s antes del vencimiento real para no entregar una URL a punto de expirar.
  cacheUrlsFirmadas.set(clave, { url: data.signedUrl, expiraEn: ahora + (segundos - 60) * 1000 })
  return data.signedUrl
}

/** Descarga una foto privada al dispositivo (en vez de solo mostrarla) con el nombre dado. */
export async function descargarFoto(bucket: BucketFotos, path: string, nombreArchivo: string) {
  const url = await obtenerUrlFirmada(bucket, path)
  const blob = await (await fetch(url)).blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
