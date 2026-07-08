import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { Spinner } from '../../components/Spinner'
import type { UserRole } from '../../lib/types'

export const RUTA_POR_ROL: Record<UserRole, string> = {
  super_admin: '/admin',
  admin: '/admin',
  salesman: '/vendedor',
  operario: '/operario',
}

export function RutaProtegida({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { session, profile, cargando } = useAuth()

  if (cargando) return <Spinner texto="Cargando..." />
  if (!session || !profile) return <Navigate to="/login" replace />
  if (!roles.includes(profile.role)) {
    return <Navigate to={RUTA_POR_ROL[profile.role]} replace />
  }

  return <>{children}</>
}
