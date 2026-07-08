import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { Spinner } from './components/Spinner'
import { Login } from './features/auth/Login'
import { RutaProtegida, RUTA_POR_ROL } from './features/auth/RutaProtegida'
import { SalesmanLayout } from './features/salesman/SalesmanLayout'
import { PanelVendedor } from './features/salesman/PanelVendedor'
import { MiRuta } from './features/salesman/MiRuta'
import { HistorialSemanas } from './features/salesman/HistorialSemanas'
import { AdminLayout } from './features/admin/AdminLayout'
import { ResumenAdmin } from './features/admin/ResumenAdmin'
import { VendedoresAdmin } from './features/admin/VendedoresAdmin'
import { AnaliticaAdmin } from './features/admin/AnaliticaAdmin'
import { RolesAdmin } from './features/admin/RolesAdmin'
import { TiendasAdmin } from './features/admin/TiendasAdmin'
import { OperarioLayout } from './features/operario/OperarioLayout'
import { PanelOperario } from './features/operario/PanelOperario'

function InicioRedirect() {
  const { session, profile, cargando } = useAuth()
  if (cargando) return <Spinner texto="Cargando..." />
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={RUTA_POR_ROL[profile.role]} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InicioRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/vendedor"
        element={
          <RutaProtegida roles={['salesman']}>
            <SalesmanLayout />
          </RutaProtegida>
        }
      >
        <Route index element={<PanelVendedor />} />
        <Route path="ruta" element={<MiRuta />} />
        <Route path="historial/:weekId?" element={<HistorialSemanas />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RutaProtegida roles={['admin', 'super_admin']}>
            <AdminLayout />
          </RutaProtegida>
        }
      >
        <Route index element={<ResumenAdmin />} />
        <Route path="vendedores" element={<VendedoresAdmin />} />
        <Route path="tiendas/:storeId?" element={<TiendasAdmin />} />
        <Route path="analitica/:salesmanId?/:weekId?" element={<AnaliticaAdmin />} />
        <Route path="roles" element={<RolesAdmin />} />
      </Route>

      <Route
        path="/operario"
        element={
          <RutaProtegida roles={['operario']}>
            <OperarioLayout />
          </RutaProtegida>
        }
      >
        <Route index element={<PanelOperario />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
