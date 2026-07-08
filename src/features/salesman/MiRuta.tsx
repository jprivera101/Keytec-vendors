import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { obtenerSemanaActiva } from '../../lib/api'
import { Spinner } from '../../components/Spinner'
import { ResumenRuta } from './ResumenRuta'
import { NuevaVentaModal } from './NuevaVentaModal'
import { IconRuta } from '../../components/icons'

export function MiRuta() {
  const { profile } = useAuth()
  const userId = profile!.id
  const queryClient = useQueryClient()
  const [visitaParaVenta, setVisitaParaVenta] = useState<string | null>(null)

  const semanaQuery = useQuery({
    queryKey: ['semana-activa', userId],
    queryFn: () => obtenerSemanaActiva(userId),
  })

  if (semanaQuery.isLoading) return <Spinner texto="Cargando tu ruta..." />

  const semana = semanaQuery.data

  if (!semana) {
    return (
      <div className="card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <IconRuta width={24} height={24} />
        </span>
        <p className="mt-3 font-medium text-slate-700">Todavía no tienes una semana activa</p>
        <p className="mt-1 text-sm text-slate-400">
          Inicia tu semana desde Inicio para ver aquí tu ruta, tus visitas y tus ventas.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <IconRuta width={20} height={20} />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Mi ruta de esta semana</h1>
          <p className="text-sm text-slate-500">Tus visitas y tus ventas, de un vistazo.</p>
        </div>
      </div>

      <ResumenRuta
        weekId={semana.id}
        puedeAgregarVenta={semana.status === 'active'}
        onAgregarVenta={setVisitaParaVenta}
      />

      {visitaParaVenta && (
        <NuevaVentaModal
          abierto={!!visitaParaVenta}
          visitId={visitaParaVenta}
          userId={userId}
          country={profile?.country}
          onCerrar={() => setVisitaParaVenta(null)}
          onCreada={() => queryClient.invalidateQueries({ queryKey: ['visitas', semana.id] })}
        />
      )}
    </div>
  )
}
