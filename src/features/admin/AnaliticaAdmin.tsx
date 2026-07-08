import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { obtenerSemanasDeVendedor, obtenerVendedores } from '../../lib/api'
import { obtenerTiendasPorRegion } from '../../lib/tiendas'
import { obtenerRegionesPorPais } from '../../lib/regiones'
import { Spinner } from '../../components/Spinner'
import { BuscadorVendedor } from '../../components/BuscadorVendedor'
import { PageHeader } from '../../components/PageHeader'
import { IconAnalitica } from '../../components/icons'
import { DetalleSemana } from '../shared/DetalleSemana'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode } from '../../lib/types'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function AnaliticaAdmin() {
  const { pais } = useOutletContext<AdminOutletContext>()
  const { salesmanId, weekId } = useParams<{ salesmanId?: string; weekId?: string }>()
  const navigate = useNavigate()

  // El flujo es en cascada: Región -> Vendedor -> Año -> Mes -> Semana. Cada paso solo
  // aparece una vez elegido el anterior, para no abrumar con todo a la vez.
  const [regionId, setRegionId] = useState('')
  const [anioFiltro, setAnioFiltro] = useState<number | 'ALL'>('ALL')
  const [mesFiltro, setMesFiltro] = useState<number | 'ALL'>('ALL')

  const regionesQuery = useQuery({
    queryKey: ['regiones-analitica', pais],
    queryFn: () => obtenerRegionesPorPais(pais as CountryCode),
    enabled: pais !== 'ALL',
  })

  // Lista completa del pais (sin filtrar por region todavia): se filtra en el cliente al
  // elegir la region, y sirve tambien para reconocer el vendedor si se llega por un link
  // directo (ej. "Ver rutas" desde Vendedores) sin haber pasado antes por Región.
  const vendedoresQuery = useQuery({
    queryKey: ['vendedores', pais],
    queryFn: () => obtenerVendedores(pais),
  })

  const semanasQuery = useQuery({
    queryKey: ['semanas-vendedor', salesmanId],
    queryFn: () => obtenerSemanasDeVendedor(salesmanId!),
    enabled: !!salesmanId,
  })

  const vendedorSeleccionado = vendedoresQuery.data?.find((v) => v.id === salesmanId)
  const tiendasRegionQuery = useQuery({
    queryKey: ['tiendas-region', vendedorSeleccionado?.route_id],
    queryFn: () => obtenerTiendasPorRegion(vendedorSeleccionado!.route_id!),
    enabled: !!vendedorSeleccionado?.route_id,
  })

  const vendedoresDeLaRegion = (vendedoresQuery.data ?? []).filter((v) => v.route_id === regionId)

  const aniosDisponibles = Array.from(
    new Set((semanasQuery.data ?? []).map((s) => new Date(s.start_date).getFullYear())),
  ).sort((a, b) => b - a)

  const semanasFiltradas = (semanasQuery.data ?? []).filter((s) => {
    const fecha = new Date(s.start_date)
    if (anioFiltro !== 'ALL' && fecha.getFullYear() !== anioFiltro) return false
    if (mesFiltro !== 'ALL' && fecha.getMonth() !== mesFiltro) return false
    return true
  })

  // Si cambia el pais, la region elegida ya no aplica.
  useEffect(() => {
    setRegionId('')
  }, [pais])

  // Llegando por un link directo a un vendedor (sin haber elegido region todavia), se
  // reconoce su region automaticamente para no dejar la pantalla "vacia".
  useEffect(() => {
    if (regionId || !salesmanId || !vendedoresQuery.data) return
    const vendedor = vendedoresQuery.data.find((v) => v.id === salesmanId)
    if (vendedor?.route_id) setRegionId(vendedor.route_id)
  }, [regionId, salesmanId, vendedoresQuery.data])

  // Si el vendedor elegido ya no pertenece a la region elegida (cambio de region), se
  // limpia la seleccion para no mostrar datos de otra region.
  useEffect(() => {
    if (!salesmanId || !vendedoresQuery.data || !regionId) return
    const vendedor = vendedoresQuery.data.find((v) => v.id === salesmanId)
    if (vendedor && vendedor.route_id !== regionId) {
      navigate('/admin/analitica', { replace: true })
    }
  }, [regionId, salesmanId, vendedoresQuery.data, navigate])

  // Con vendedor elegido, si la semana actual no esta en el periodo filtrado, entra
  // directo con la mas reciente dentro de ese periodo (para "ver los datos" de una vez).
  useEffect(() => {
    if (!salesmanId || semanasFiltradas.length === 0) return
    const sigueValida = semanasFiltradas.some((s) => s.id === weekId)
    if (!weekId || !sigueValida) {
      navigate(`/admin/analitica/${salesmanId}/${semanasFiltradas[0].id}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesmanId, weekId, anioFiltro, mesFiltro, semanasQuery.data, navigate])

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconAnalitica />}
        color="highlight"
        title="Analítica"
        subtitle="Ruta, visitas y ventas de la semana seleccionada."
      />

      <div className="card space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Región</label>
            {pais === 'ALL' ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400">
                Selecciona un país en el panel lateral
              </p>
            ) : (
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="input-field"
              >
                <option value="" disabled>
                  Selecciona una región
                </option>
                {regionesQuery.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {regionId && (
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Vendedor</label>
              <BuscadorVendedor
                vendedores={vendedoresDeLaRegion}
                valor={salesmanId ?? ''}
                onSeleccionar={(id) => navigate(`/admin/analitica/${id}`)}
                etiquetaPais={pais === 'ALL' ? (v) => (v.country ? NOMBRE_PAIS[v.country] : null) : undefined}
              />
            </div>
          )}
        </div>

        {salesmanId && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Año</label>
              <select
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="input-field"
              >
                <option value="ALL">Todos</option>
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Mes</label>
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="input-field"
              >
                <option value="ALL">Todos</option>
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={i}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Semana</label>
              <select
                value={weekId ?? ''}
                onChange={(e) => navigate(`/admin/analitica/${salesmanId}/${e.target.value}`)}
                disabled={!semanasFiltradas.length}
                className="input-field"
              >
                {semanasFiltradas.map((semana) => (
                  <option key={semana.id} value={semana.id}>
                    {new Date(semana.start_date).toLocaleDateString('es-GT')}
                    {semana.status === 'active' ? ' · activa' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {!regionId ? (
        <EstadoVacio texto="Elige una región para empezar." />
      ) : !salesmanId ? (
        <EstadoVacio texto="Elige un vendedor para ver sus semanas." />
      ) : semanasQuery.isLoading ? (
        <Spinner />
      ) : semanasQuery.data?.length === 0 ? (
        <EstadoVacio texto="Este vendedor aún no tiene semanas registradas." />
      ) : semanasFiltradas.length === 0 ? (
        <EstadoVacio texto="No hay semanas registradas en el período seleccionado." />
      ) : weekId ? (
        <DetalleSemana
          weekId={weekId}
          tiendasRegion={tiendasRegionQuery.data ?? []}
          country={vendedorSeleccionado?.country}
        />
      ) : (
        <Spinner />
      )}
    </div>
  )
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
      {texto}
    </div>
  )
}
