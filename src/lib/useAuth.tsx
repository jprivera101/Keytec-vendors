import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { Profile, UserRole } from './types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  cargando: boolean
  authError: string | null
  iniciarSesion: (email: string, password: string) => Promise<{ error: string | null }>
  cerrarSesion: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Supabase mantiene la sesión (via refresh token) indefinidamente entre reinicios del
// navegador -- por diseño, para no pedir contraseña cada vez. Pero eso significa que alguien
// que abra el navegador de otra persona (o un dispositivo compartido) entra directo, sin
// importar cuánto tiempo haya pasado. Para datos de ventas/depósitos/códigos de negocio esto
// no es aceptable: si no hay actividad por más del límite de su rol, se cierra la sesión
// sola, tanto al reabrir la app como en medio de una sesión ya abierta.
//
// El límite varía por rol porque el ritmo de uso es muy distinto: un vendedor pasa horas
// enteras haciendo una ruta sin tocar el teléfono, un operario procesa ventas todo el día
// seguido, y un admin cae en medio.
const LIMITES_INACTIVIDAD_MS: Partial<Record<UserRole, number>> = {
  salesman: 3 * 60 * 60 * 1000, // 3 horas
  operario: 45 * 60 * 1000, // 45 minutos
  admin: 2 * 60 * 60 * 1000, // 2 horas
  super_admin: 2 * 60 * 60 * 1000, // 2 horas
}
const LIMITE_POR_DEFECTO_MS = 20 * 60 * 1000 // mientras todavía no se sabe el rol
const CLAVE_ULTIMA_ACTIVIDAD = 'ultima_actividad'
const EVENTOS_ACTIVIDAD = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

function marcarActividad() {
  localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()))
}

function msInactivo(): number {
  const valor = localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)
  return valor ? Date.now() - Number(valor) : 0
}

function limiteDe(rol: UserRole | null | undefined): number {
  return (rol && LIMITES_INACTIVIDAD_MS[rol]) ?? LIMITE_POR_DEFECTO_MS
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  // El intervalo periódico (definido una sola vez, en el useEffect de montaje) necesita
  // conocer el rol vigente para saber contra qué límite comparar; un ref evita tener que
  // recrear el intervalo cada vez que cambia el perfil.
  const rolActualRef = useRef<UserRole | null>(null)
  // Detecta cambio de usuario (no solo refresh del mismo token) para saber cuándo limpiar
  // el cache de React Query -- ver comentario en onAuthStateChange más abajo.
  const usuarioActualRef = useRef<string | null>(null)

  async function cargarPerfil(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) {
      // Sesión válida pero sin perfil: no lo dejamos atascado sin explicación.
      setAuthError(
        'Tu cuenta no tiene un perfil configurado. Pide al administrador que revise tu usuario.',
      )
      setProfile(null)
      await supabase.auth.signOut()
      setCargando(false)
      return
    }
    if (msInactivo() > limiteDe(data.role)) {
      // Sesión técnicamente válida (el refresh token no venció), pero pasó más tiempo del
      // que su rol permite sin actividad: se cierra y se pide iniciar sesión de nuevo.
      await supabase.auth.signOut()
      setProfile(null)
      setCargando(false)
      return
    }
    marcarActividad()
    rolActualRef.current = data.role
    setProfile(data)
    setCargando(false)
  }

  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      usuarioActualRef.current = data.session?.user.id ?? null
      setSession(data.session)
      if (data.session) cargarPerfil(data.session.user.id)
      else setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      const nuevoUsuarioId = nuevaSesion?.user.id ?? null
      // Distinto de un simple refresh de token: es un logout, un login, o -- en un
      // dispositivo compartido -- que ahora hay una persona distinta en la sesión. Sin
      // limpiar el cache de React Query, las queries que no llevan el id del usuario en su
      // key (p.ej. ventas del operario) alcanzan a mostrar por un instante datos del usuario
      // anterior mientras se resuelve el fetch nuevo, ya correctamente filtrado por RLS.
      if (nuevoUsuarioId !== usuarioActualRef.current) {
        queryClient.clear()
        usuarioActualRef.current = nuevoUsuarioId
      }
      setSession(nuevaSesion)
      if (nuevaSesion) {
        cargarPerfil(nuevaSesion.user.id)
      } else {
        rolActualRef.current = null
        setProfile(null)
        setCargando(false)
      }
    })

    // Mientras la sesión sigue abierta (sin recargar la página), cualquier interacción
    // refresca la marca de actividad, y una revisión periódica cierra la sesión apenas se
    // cumpla el límite de inactividad de su rol -- no hace falta esperar a que alguien recargue.
    EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, marcarActividad))
    const intervalo = window.setInterval(() => {
      if (msInactivo() > limiteDe(rolActualRef.current)) supabase.auth.signOut()
    }, 30_000)

    return () => {
      activo = false
      sub.subscription.unsubscribe()
      EVENTOS_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, marcarActividad))
      window.clearInterval(intervalo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciarSesion(email: string, password: string) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) marcarActividad()
    return { error: error ? traducirError(error.message) : null }
  }

  async function cerrarSesion() {
    // No hace falta esperar a onAuthStateChange para limpiar: mientras esa vuelta redonda
    // resuelve, alguien podría alcanzar a ver un instante de datos del usuario que se va.
    queryClient.clear()
    usuarioActualRef.current = null
    await supabase.auth.signOut()
  }

  async function refrescarPerfil() {
    if (session) await cargarPerfil(session.user.id)
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, cargando, authError, iniciarSesion, cerrarSesion, refrescarPerfil }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function traducirError(mensaje: string) {
  if (mensaje.toLowerCase().includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos'
  }
  return mensaje
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
