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

  useEffect(() => {
    let activo = true
    obtenerUrlFirmada(bucket, path).then((u) => {
      if (activo) setUrl(u)
    })
    return () => {
      activo = false
    }
  }, [bucket, path])

  if (!url) {
    return <div className={`${className ?? ''} animate-pulse bg-slate-200`} />
  }

  return <img src={url} alt={alt} className={className} />
}
