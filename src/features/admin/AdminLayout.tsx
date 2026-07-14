import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { PoweredByPenthouse } from '../../components/PoweredByPenthouse'
import { obtenerRegionesPorPais } from '../../lib/regiones'
import { IconAnalitica, IconGlobo, IconResumen, IconRoles, IconTiendas, IconVendedores } from '../../components/icons'
import { Flag } from '../../components/flags'
import type { CountryCode, Profile } from '../../lib/types'

export interface AdminOutletContext {
  pais: CountryCode | 'ALL'
  region: string | 'ALL'
  profile: Profile
}

export const NOMBRE_PAIS: Record<CountryCode, string> = {
  GT: 'Guatemala',
  SV: 'El Salvador',
}

const OPCIONES_PAIS: { valor: CountryCode | 'ALL'; etiqueta: string }[] = [
  { valor: 'ALL', etiqueta: 'Todos' },
  { valor: 'GT', etiqueta: 'GT' },
  { valor: 'SV', etiqueta: 'SV' },
]

export function AdminLayout() {
  const { profile, cerrarSesion } = useAuth()
  const [paisFiltro, setPaisFiltro] = useState<CountryCode | 'ALL'>('ALL')
  const [regionFiltro, setRegionFiltro] = useState<string | 'ALL'>('ALL')

  const esSuperAdmin = profile?.role === 'super_admin'
  const pais = esSuperAdmin ? paisFiltro : ((profile?.country ?? 'ALL') as CountryCode | 'ALL')

  const regionesQuery = useQuery({
    queryKey: ['regiones-filtro', pais],
    queryFn: () => obtenerRegionesPorPais(pais as CountryCode),
    enabled: pais !== 'ALL',
  })

  // Si cambia el pais (o deja de haber uno especifico) la region elegida ya no aplica.
  useEffect(() => {
    setRegionFiltro('ALL')
  }, [pais])

  if (!profile) return null

  const enlaces = [
    { to: '/admin', etiqueta: 'Resumen', fin: true, Icono: IconResumen },
    ...(esSuperAdmin
      ? []
      : [{ to: '/admin/vendedores', etiqueta: 'Vendedores', fin: false, Icono: IconVendedores }]),
    { to: '/admin/tiendas', etiqueta: 'Tiendas', fin: false, Icono: IconTiendas },
    { to: '/admin/analitica', etiqueta: 'Analítica', fin: false, Icono: IconAnalitica },
    ...(esSuperAdmin ? [{ to: '/admin/roles', etiqueta: 'Roles', fin: false, Icono: IconRoles }] : []),
  ]

  function SelectorPais({ oscuro }: { oscuro: boolean }) {
    return (
      <div>
        <p
          className={`mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            oscuro ? 'text-white/40' : 'text-slate-400'
          }`}
        >
          País
        </p>
        {esSuperAdmin ? (
          <div className={`flex gap-1 rounded-lg p-1 ${oscuro ? 'bg-white/10' : 'bg-slate-100'}`}>
            {OPCIONES_PAIS.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setPaisFiltro(opcion.valor)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  paisFiltro === opcion.valor
                    ? 'bg-white text-ink-700 shadow-sm'
                    : oscuro
                      ? 'text-white/60 hover:text-white'
                      : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opcion.valor === 'ALL' ? (
                  <IconGlobo width={14} height={14} />
                ) : (
                  <Flag country={opcion.valor} size={13} />
                )}
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        ) : (
          <p
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              oscuro ? 'bg-white/10 text-white/90' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Flag country={profile!.country as CountryCode} size={15} />
            {NOMBRE_PAIS[profile!.country as CountryCode]}
          </p>
        )}
      </div>
    )
  }

  function SelectorRegion({ oscuro }: { oscuro: boolean }) {
    if (pais === 'ALL') return null
    return (
      <select
        value={regionFiltro}
        onChange={(e) => setRegionFiltro(e.target.value)}
        className={`w-full rounded-lg px-3 py-2 text-sm [&>option]:text-slate-900 ${
          oscuro ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
        }`}
      >
        <option value="ALL">Todas las regiones</option>
        {regionesQuery.data?.map((region) => (
          <option key={region.id} value={region.id}>
            {region.name}
          </option>
        ))}
      </select>
    )
  }

  const rolEtiqueta = esSuperAdmin
    ? 'Super admin'
    : profile.country
      ? `Admin · ${NOMBRE_PAIS[profile.country]}`
      : 'Admin'

  return (
    <div className="min-h-full bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-700 text-white lg:flex">
        <div className="p-4">
          <img src="/keytec-sidebar.png" alt="KeyTec" className="w-full rounded-xl" />
        </div>

        <div className="space-y-2 px-3 pb-4">
          <SelectorPais oscuro />
          <SelectorRegion oscuro />
        </div>

        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Menú</p>
        <nav className="space-y-1 px-3">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.fin}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-[#0092D2] bg-white/10 text-white'
                    : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <enlace.Icono />
              {enlace.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="mx-3 mb-3 rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
          <p className="text-xs text-white/40">{rolEtiqueta}</p>
          <button onClick={cerrarSesion} className="mt-2 text-xs font-medium text-white/60 hover:text-white">
            Cerrar sesión
          </button>
        </div>

        <div className="border-t border-white/10 px-6 py-4">
          <PoweredByPenthouse className="justify-start text-white/40" />
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between bg-ink-700 px-4 py-3 text-white lg:hidden">
          <img src="/keytec-sidebar.png" alt="KeyTec" className="h-7 w-auto rounded-md" />
          <button onClick={cerrarSesion} className="text-sm text-white/70">
            Salir
          </button>
        </header>

        <div className="space-y-2 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <SelectorPais oscuro={false} />
          <SelectorRegion oscuro={false} />
        </div>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 lg:hidden">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.fin}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
                }`
              }
            >
              <enlace.Icono />
              {enlace.etiqueta}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet context={{ pais, region: regionFiltro, profile } satisfies AdminOutletContext} />
          <PoweredByPenthouse className="mt-8 lg:hidden" />
        </main>
      </div>
    </div>
  )
}
