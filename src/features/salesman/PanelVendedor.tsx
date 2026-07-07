import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { Spinner } from '../../components/Spinner'
import { obtenerSemanaActiva, obtenerVisitasConVentas } from '../../lib/api'
import { crearSemana, finalizarSemana } from '../../lib/api'
import { IniciarSemanaModal } from './IniciarSemanaModal'
import { FinalizarSemanaModal } from './FinalizarSemanaModal'
import { NuevaVisitaModal } from './NuevaVisitaModal'
import { NuevaVentaModal } from './NuevaVentaModal'
import { VisitaCard } from '../shared/VisitaCard'

export function PanelVendedor() {
  const { profile, cerrarSesion } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile!.id

  const [modalIniciar, setModalIniciar] = useState(false)
  const [modalFinalizar, setModalFinalizar] = useState(false)
  const [modalVisita, setModalVisita] = useState(false)
  const [visitaParaVenta, setVisitaParaVenta] = useState<string | null>(null)

  const semanaQuery = useQuery({
    queryKey: ['semana-activa', userId],
    queryFn: () => obtenerSemanaActiva(userId),
  })

  const semana = semanaQuery.data

  const visitasQuery = useQuery({
    queryKey: ['visitas', semana?.id],
    queryFn: () => obtenerVisitasConVentas(semana!.id),
    enabled: !!semana,
  })

  async function manejarIniciarSemana(km: number) {
    await crearSemana(userId, km)
    await queryClient.invalidateQueries({ queryKey: ['semana-activa', userId] })
    setModalIniciar(false)
  }

  async function manejarFinalizarSemana(km: number) {
    if (!semana) return
    await finalizarSemana(semana.id, km)
    await queryClient.invalidateQueries({ queryKey: ['semana-activa', userId] })
    setModalFinalizar(false)
  }

  function refrescarVisitas() {
    queryClient.invalidateQueries({ queryKey: ['visitas', semana?.id] })
  }

  if (semanaQuery.isLoading) return <Spinner texto="Cargando..." />

  return (
    <div className="mx-auto min-h-full max-w-md bg-slate-50 pb-10">
      <header className="flex items-center justify-between bg-white px-4 py-4 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">Hola,</p>
          <p className="font-semibold text-slate-900">{profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/vendedor/historial" className="font-medium text-brand-700">
            Historial
          </Link>
          <button onClick={cerrarSesion} className="font-medium text-slate-400">
            Salir
          </button>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {!semana && (
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <p className="mb-4 text-slate-600">No tienes una semana activa todavía.</p>
            <button
              type="button"
              onClick={() => setModalIniciar(true)}
              className="w-full rounded-lg bg-brand-700 py-3 font-semibold text-white"
            >
              Iniciar semana
            </button>
          </div>
        )}

        {semana && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Semana activa
                </span>
                <span className="text-xs text-slate-400">
                  Desde {new Date(semana.start_date).toLocaleDateString('es-GT')}
                </span>
              </div>
              <p className="text-sm text-slate-500">Kilometraje inicial: {semana.start_mileage_km} km</p>
            </div>

            <button
              type="button"
              onClick={() => setModalVisita(true)}
              className="w-full rounded-xl bg-brand-700 py-3 font-semibold text-white shadow-sm"
            >
              + Registrar visita a tienda
            </button>

            <div>
              <h3 className="mb-2 px-1 text-sm font-semibold text-slate-500">Visitas de esta semana</h3>
              {visitasQuery.isLoading && <Spinner />}
              <div className="space-y-3">
                {visitasQuery.data?.map((visita) => (
                  <VisitaCard
                    key={visita.id}
                    visita={visita}
                    puedeAgregarVenta
                    onAgregarVenta={setVisitaParaVenta}
                  />
                ))}
                {visitasQuery.data?.length === 0 && (
                  <p className="px-1 text-sm text-slate-400">Aún no registras visitas esta semana.</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalFinalizar(true)}
              className="w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-600"
            >
              Finalizar semana
            </button>
          </>
        )}
      </main>

      <IniciarSemanaModal
        abierto={modalIniciar}
        onCerrar={() => setModalIniciar(false)}
        onConfirmar={manejarIniciarSemana}
      />

      {semana && (
        <FinalizarSemanaModal
          abierto={modalFinalizar}
          kmInicial={semana.start_mileage_km}
          onCerrar={() => setModalFinalizar(false)}
          onConfirmar={manejarFinalizarSemana}
        />
      )}

      {semana && (
        <NuevaVisitaModal
          abierto={modalVisita}
          weekId={semana.id}
          userId={userId}
          onCerrar={() => setModalVisita(false)}
          onCreada={() => {
            setModalVisita(false)
            refrescarVisitas()
          }}
        />
      )}

      {visitaParaVenta && (
        <NuevaVentaModal
          abierto={!!visitaParaVenta}
          visitId={visitaParaVenta}
          userId={userId}
          onCerrar={() => setVisitaParaVenta(null)}
          onCreada={refrescarVisitas}
        />
      )}
    </div>
  )
}
