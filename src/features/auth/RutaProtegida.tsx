import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { Spinner } from '../../components/Spinner'
import type { UserRole } from '../../lib/types'

export function RutaProtegida({ rol, children }: { rol: UserRole; children: ReactNode }) {
  const { session, profile, cargando } = useAuth()

  if (cargando) return <Spinner texto="Cargando..." />
  if (!session || !profile) return <Navigate to="/login" replace />
  if (profile.role !== rol) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/vendedor'} replace />
  }

  return <>{children}</>
}
