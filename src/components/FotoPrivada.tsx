import { useEffect, useState } from 'react'
import { obtenerUrlFirmada, type BucketFotos } from '../lib/storage'

interface Props {
  bucket: BucketFotos
  path: string
  className?: string
  alt: string
}

export function FotoPrivada({ bucket, path, className, alt }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let activo = true
    setUrl(null)
    setFallo(false)
    obtenerUrlFirmada(bucket, path)
      .then((u) => {
        if (activo) setUrl(u)
      })
      .catch((e) => {
        console.error(`No se pudo cargar la foto (${bucket}/${path}):`, e)
        if (activo) setFallo(true)
      })
    return () => {
      activo = false
    }
  }, [bucket, path])

  if (fallo) {
    return (
      <div
        className={`${className ?? ''} flex items-center justify-center bg-slate-100 text-center text-[10px] text-slate-400`}
      >
        Foto no disponible
      </div>
    )
  }

  if (!url) {
    return <div className={`${className ?? ''} animate-pulse bg-slate-200`} />
  }

  return <img src={url} alt={alt} className={className} />
}
