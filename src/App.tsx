import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { Spinner } from './components/Spinner'
import { Login } from './features/auth/Login'
import { RutaProtegida } from './features/auth/RutaProtegida'
import { PanelVendedor } from './features/salesman/PanelVendedor'
import { HistorialSemanas } from './features/salesman/HistorialSemanas'
import { PanelAdmin } from './features/admin/PanelAdmin'
import { DetalleVendedor } from './features/admin/DetalleVendedor'
import { CrearVendedor } from './features/admin/CrearVendedor'

function InicioRedirect() {
  const { session, profile, cargando } = useAuth()
  if (cargando) return <Spinner texto="Cargando..." />
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/vendedor'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InicioRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/vendedor"
        element={
          <RutaProtegida rol="salesman">
            <PanelVendedor />
          </RutaProtegida>
        }
      />
      <Route
        path="/vendedor/historial/:weekId?"
        element={
          <RutaProtegida rol="salesman">
            <HistorialSemanas />
          </RutaProtegida>
        }
      />

      <Route
        path="/admin"
        element={
          <RutaProtegida rol="admin">
            <PanelAdmin />
          </RutaProtegida>
        }
      />
      <Route
        path="/admin/crear-vendedor"
        element={
          <RutaProtegida rol="admin">
            <CrearVendedor />
          </RutaProtegida>
        }
      />
      <Route
        path="/admin/vendedor/:salesmanId/semana/:weekId?"
        element={
          <RutaProtegida rol="admin">
            <DetalleVendedor />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
