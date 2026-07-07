const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.7

/** Redimensiona y comprime una imagen en el navegador antes de subirla (ahorra datos moviles). */
export async function comprimirImagen(archivo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)

  const escala = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto

  const ctx = canvas.getContext('2d')
  if (!ctx) return archivo

  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )

  return blob ?? archivo
}
