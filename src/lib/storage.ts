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

/** Genera una URL firmada temporal para mostrar una foto privada. */
export async function obtenerUrlFirmada(bucket: BucketFotos, path: string, segundos = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, segundos)
  if (error) throw error
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
