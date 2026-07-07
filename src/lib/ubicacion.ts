export interface Coordenadas {
  latitude: number
  longitude: number
}

/** Pide la ubicacion actual del dispositivo, con mensajes de error en español. */
export function obtenerUbicacion(): Promise<Coordenadas> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no soporta ubicacion'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolve({
          latitude: posicion.coords.latitude,
          longitude: posicion.coords.longitude,
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Debes permitir el acceso a la ubicacion para registrar la visita'))
        } else {
          reject(new Error('No se pudo obtener la ubicacion, intenta de nuevo'))
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}
