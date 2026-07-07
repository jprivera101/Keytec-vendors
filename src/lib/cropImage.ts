import type { Area } from 'react-easy-crop'

function crearImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.crossOrigin = 'anonymous'
    image.src = url
  })
}

function gradosARadianes(grados: number) {
  return (grados * Math.PI) / 180
}

/** Recorta y rota una imagen segun lo seleccionado en el editor, devuelve un Blob JPEG. */
export async function recortarImagen(
  imageSrc: string,
  areaRecorte: Area,
  rotacionGrados = 0,
): Promise<Blob> {
  const image = await crearImagen(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el canvas')

  const radianes = gradosARadianes(rotacionGrados)
  const sin = Math.abs(Math.sin(radianes))
  const cos = Math.abs(Math.cos(radianes))
  const cajaAncho = image.width * cos + image.height * sin
  const cajaAlto = image.width * sin + image.height * cos

  canvas.width = cajaAncho
  canvas.height = cajaAlto

  ctx.translate(cajaAncho / 2, cajaAlto / 2)
  ctx.rotate(radianes)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const datosRotados = ctx.getImageData(0, 0, cajaAncho, cajaAlto)

  canvas.width = areaRecorte.width
  canvas.height = areaRecorte.height

  ctx.putImageData(
    datosRotados,
    Math.round(-areaRecorte.x),
    Math.round(-areaRecorte.y),
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo generar la imagen recortada'))
    }, 'image/jpeg', 0.85)
  })
}
