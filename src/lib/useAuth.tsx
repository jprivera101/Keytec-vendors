import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { Profile } from './types'

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
// no es aceptable: si no hay actividad por INACTIVIDAD_MAXIMA_MS, se cierra la sesión sola,
// tanto al reabrir la app como en medio de una sesión ya abierta.
const INACTIVIDAD_MAXIMA_MS = 20 * 60 * 1000 // 20 minutos
const CLAVE_ULTIMA_ACTIVIDAD = 'ultima_actividad'
const EVENTOS_ACTIVIDAD = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

function marcarActividad() {
  localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()))
}

function estaInactivo(): boolean {
  const valor = localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)
  if (!valor) return false // primera vez en este dispositivo: no hay nada que comparar todavía
  return Date.now() - Number(valor) > INACTIVIDAD_MAXIMA_MS
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    async function iniciar() {
      const { data } = await supabase.auth.getSession()
      if (!activo) return

      if (data.session && estaInactivo()) {
        // La sesión técnicamente sigue siendo válida (el refresh token no venció), pero pasó
        // demasiado tiempo sin uso: se cierra y se pide iniciar sesión de nuevo.
        await supabase.auth.signOut()
        if (!activo) return
        setSession(null)
        setProfile(null)
        setCargando(false)
        return
      }

      marcarActividad()
      setSession(data.session)
      if (data.session) cargarPerfil(data.session.user.id)
      else setCargando(false)
    }
    iniciar()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion)
      if (nuevaSesion) {
        marcarActividad()
        cargarPerfil(nuevaSesion.user.id)
      } else {
        setProfile(null)
        setCargando(false)
      }
    })

    // Mientras la sesión sigue abierta (sin recargar la página), cualquier interacción
    // refresca la marca de actividad, y una revisión periódica cierra la sesión apenas se
    // cumpla el límite de inactividad -- no hace falta esperar a que alguien recargue.
    EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, marcarActividad))
    const intervalo = window.setInterval(() => {
      if (estaInactivo()) supabase.auth.signOut()
    }, 30_000)

    return () => {
      activo = false
      sub.subscription.unsubscribe()
      EVENTOS_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, marcarActividad))
      window.clearInterval(intervalo)
    }
  }, [])

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
    setProfile(data)
    setCargando(false)
  }

  async function iniciarSesion(email: string, password: string) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) marcarActividad()
    return { error: error ? traducirError(error.message) : null }
  }

  async function cerrarSesion() {
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
