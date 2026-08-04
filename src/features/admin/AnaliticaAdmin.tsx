import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { obtenerSemanasDeVendedor, obtenerVendedores, obtenerVisitasPorPaisYRango } from '../../lib/api'
import { obtenerTiendasPorRegion } from '../../lib/tiendas'
import { obtenerRegionesPorPais } from '../../lib/regiones'
import { fechaLocalISO, lunesDeLaSemana, limitesSemanaCalendario, semanasCalendarioDeMes } from '../../lib/fechas'
import { Spinner } from '../../components/Spinner'
import { BuscadorVendedor } from '../../components/BuscadorVendedor'
import { PageHeader } from '../../components/PageHeader'
import { IconAnalitica, IconChevron } from '../../components/icons'
import { DetalleSemana } from '../shared/DetalleSemana'
import { MapaMultiVendedor } from './MapaMultiVendedor'
import { NOMBRE_PAIS, type AdminOutletContext } from './AdminLayout'
import type { CountryCode } from '../../lib/types'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function AnaliticaAdmin() {
  const { pais, profile } = useOutletContext<AdminOutletContext>()
  const { salesmanId, weekId } = useParams<{ salesmanId?: string; weekId?: string }>()
  const navigate = useNavigate()

  // El flujo es en cascada: Región -> Vendedor -> Año -> Mes -> Semana. Cada paso solo
  // aparece una vez elegido el anterior, para no abrumar con todo a la vez. "Todas las
  // regiones" deja elegir cualquier vendedor del país sin fijarse en una región puntual.
  const [regionId, setRegionId] = useState<string>('')
  const [anioFiltro, setAnioFiltro] = useState<number | 'ALL'>('ALL')
  const [mesFiltro, setMesFiltro] = useState<number | 'ALL'>('ALL')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  // Vista "todas las regiones" sin vendedor elegido: mapa comparativo de varios vendedores
  // a la vez. Usa semana calendario (lunes-domingo), no la semana propia de cada vendedor
  // (que empieza cuando cada uno decide), porque el punto es comparar el mismo período.
  const hoy = new Date()
  const [anioMultiFiltro, setAnioMultiFiltro] = useState(hoy.getFullYear())
  const [mesMultiFiltro, setMesMultiFiltro] = useState(hoy.getMonth())
  const [semanaMultiInicio, setSemanaMultiInicio] = useState(fechaLocalISO(lunesDeLaSemana(hoy)))

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

  const vendedoresDeLaRegion =
    regionId === 'ALL'
      ? (vendedoresQuery.data ?? [])
      : (vendedoresQuery.data ?? []).filter((v) => v.route_id === regionId)

  const aniosDisponibles = Array.from(
    new Set((semanasQuery.data ?? []).map((s) => new Date(s.start_date).getFullYear())),
  ).sort((a, b) => b - a)

  const semanasFiltradas = (semanasQuery.data ?? []).filter((s) => {
    const fecha = new Date(s.start_date)
    if (anioFiltro !== 'ALL' && fecha.getFullYear() !== anioFiltro) return false
    if (mesFiltro !== 'ALL' && fecha.getMonth() !== mesFiltro) return false
    return true
  })

  const vistaMulti = regionId === 'ALL' && !salesmanId
  const semanasMultiDisponibles = semanasCalendarioDeMes(anioMultiFiltro, mesMultiFiltro)
  const rangoMulti = limitesSemanaCalendario(new Date(`${semanaMultiInicio}T00:00:00`))

  const visitasMultiQuery = useQuery({
    queryKey: ['visitas-multi-region', pais, semanaMultiInicio],
    queryFn: () => obtenerVisitasPorPaisYRango(pais as CountryCode, rangoMulti.desde, rangoMulti.hasta),
    enabled: vistaMulti && pais !== 'ALL',
  })

  const vendedoresConVisitas = (vendedoresQuery.data ?? []).map((v) => ({
    id: v.id,
    full_name: v.full_name,
    visitas: (visitasMultiQuery.data ?? []).filter((visita) => visita.salesman_id === v.id),
  }))

  // Si cambia el pais, la region elegida ya no aplica.
  useEffect(() => {
    setRegionId('')
  }, [pais])

  // Si cambia año/mes en la vista multi-vendedor, la semana elegida puede quedar fuera del
  // nuevo mes -- se cae a la primera semana disponible en vez de dejar una seleccion invalida.
  useEffect(() => {
    if (!semanasMultiDisponibles.some((lunes) => fechaLocalISO(lunes) === semanaMultiInicio)) {
      setSemanaMultiInicio(fechaLocalISO(semanasMultiDisponibles[0]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anioMultiFiltro, mesMultiFiltro])

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
    if (!salesmanId || !vendedoresQuery.data || !regionId || regionId === 'ALL') return
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
                <option value="ALL">Todas las regiones</option>
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
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Vendedor {regionId === 'ALL' && '(opcional, para ver su detalle)'}
              </label>
              <BuscadorVendedor
                vendedores={vendedoresDeLaRegion}
                valor={salesmanId ?? ''}
                onSeleccionar={(id) => navigate(`/admin/analitica/${id}`)}
                etiquetaPais={pais === 'ALL' ? (v) => (v.country ? NOMBRE_PAIS[v.country] : null) : undefined}
              />
            </div>
          )}
        </div>

        {vistaMulti && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Año</label>
              <select
                value={anioMultiFiltro}
                onChange={(e) => setAnioMultiFiltro(Number(e.target.value))}
                className="input-field"
              >
                {[hoy.getFullYear(), hoy.getFullYear() - 1].map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Mes</label>
              <select
                value={mesMultiFiltro}
                onChange={(e) => setMesMultiFiltro(Number(e.target.value))}
                className="input-field"
              >
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
                value={semanaMultiInicio}
                onChange={(e) => setSemanaMultiInicio(e.target.value)}
                className="input-field"
              >
                {semanasMultiDisponibles.map((lunes) => {
                  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6)
                  return (
                    <option key={fechaLocalISO(lunes)} value={fechaLocalISO(lunes)}>
                      {lunes.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' })} al{' '}
                      {domingo.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' })}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        )}

        {salesmanId && (
          <div>
            <button
              type="button"
              onClick={() => setFiltrosAbiertos((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-medium text-slate-500">Año, mes y semana</span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                {!filtrosAbiertos && (
                  <span>
                    {anioFiltro === 'ALL' ? 'Todos' : anioFiltro}
                    {mesFiltro !== 'ALL' && ` · ${MESES[mesFiltro]}`}
                  </span>
                )}
                <IconChevron
                  className={`transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`}
                  width={16}
                  height={16}
                />
              </span>
            </button>

            {filtrosAbiertos && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        )}
      </div>

      {!regionId ? (
        <EstadoVacio texto="Elige una región para empezar." />
      ) : vistaMulti ? (
        visitasMultiQuery.isLoading ? (
          <Spinner />
        ) : (
          <MapaMultiVendedor vendedores={vendedoresConVisitas} country={pais !== 'ALL' ? pais : null} />
        )
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
          puedeEditarGasolina
          puedeReabrirTracking
          puedeEditarKm={profile.role === 'super_admin'}
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
