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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session)
      if (data.session) cargarPerfil(data.session.user.id)
      else setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion)
      if (nuevaSesion) {
        cargarPerfil(nuevaSesion.user.id)
      } else {
        setProfile(null)
        setCargando(false)
      }
    })

    return () => {
      activo = false
      sub.subscription.unsubscribe()
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
    return { error: error ? traducirError(error.message) : null }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, cargando, authError, iniciarSesion, cerrarSesion }}
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
