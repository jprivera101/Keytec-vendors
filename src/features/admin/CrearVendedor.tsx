import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { obtenerRegionesPorPais, crearRegion } from '../../lib/regiones'
import type { CountryCode } from '../../lib/types'
import { NOMBRE_PAIS } from './AdminLayout'

const NUEVA_REGION = '__nueva_region__'

interface Props {
  onCreado: () => void
  /** Si es super_admin hay que elegir el país; un admin de país ya tiene el suyo fijo. */
  mostrarSelectorPais: boolean
  paisPredeterminado?: CountryCode
}

export function FormularioCrearVendedor({ onCreado, mostrarSelectorPais, paisPredeterminado }: Props) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [kmPerGallon, setKmPerGallon] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState<CountryCode | ''>(paisPredeterminado ?? '')
  const [regionId, setRegionId] = useState('')
  const [nuevaRegionNombre, setNuevaRegionNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const regionesQuery = useQuery({
    queryKey: ['regiones', country],
    queryFn: () => obtenerRegionesPorPais(country as CountryCode),
    enabled: !!country,
  })

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    if (mostrarSelectorPais && !country) {
      setError('Selecciona el país')
      return
    }
    if (!regionId) {
      setError('Selecciona la región')
      return
    }
    if (regionId === NUEVA_REGION && !nuevaRegionNombre.trim()) {
      setError('Ingresa el nombre de la nueva región')
      return
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      setError('El usuario debe tener 3-32 caracteres: minúsculas, números, punto, guion o guion bajo')
      return
    }
    setError(null)
    setExito(null)
    setEnviando(true)
    try {
      let finalRegionId = regionId
      if (regionId === NUEVA_REGION) {
        const nuevaRegion = await crearRegion({
          country: country as CountryCode,
          name: nuevaRegionNombre.trim(),
        })
        finalRegionId = nuevaRegion.id
      }

      const { data, error } = await supabase.functions.invoke('create-salesman', {
        body: {
          password,
          full_name: fullName,
          username,
          phone: phone || undefined,
          country: country || undefined,
          route_id: finalRegionId,
          km_per_gallon: kmPerGallon ? Number(kmPerGallon) : undefined,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setExito(`Vendedor "${fullName}" creado. Comparte con él su usuario (${username}) y contraseña.`)
      setFullName('')
      setUsername('')
      setPhone('')
      setKmPerGallon('')
      setPassword('')
      setRegionId('')
      setNuevaRegionNombre('')
      onCreado()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Usuario (para iniciar sesión)</label>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="Ej. jperez"
          className="input-field"
          autoCapitalize="none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Rendimiento (km por galón, opcional)
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          value={kmPerGallon}
          onChange={(e) => setKmPerGallon(e.target.value)}
          placeholder="Ej. 35"
          className="input-field"
        />
      </div>
      {mostrarSelectorPais && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">País</label>
          <select
            required
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="input-field"
          >
            <option value="" disabled>
              Selecciona un país
            </option>
            {(Object.keys(NOMBRE_PAIS) as CountryCode[]).map((codigo) => (
              <option key={codigo} value={codigo}>
                {NOMBRE_PAIS[codigo]}
              </option>
            ))}
          </select>
        </div>
      )}
      {country && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Región</label>
          <select
            required
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value)
              setNuevaRegionNombre('')
            }}
            className="input-field"
          >
            <option value="" disabled>
              Selecciona una región
            </option>
            {regionesQuery.data?.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
            <option value={NUEVA_REGION}>+ Nueva región</option>
          </select>
          {regionId === NUEVA_REGION && (
            <input
              type="text"
              required
              autoFocus
              placeholder="Nombre de la nueva región"
              value={nuevaRegionNombre}
              onChange={(e) => setNuevaRegionNombre(e.target.value)}
              className="input-field mt-2"
            />
          )}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña temporal</label>
        <input
          type="text"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
        <p className="mt-1 text-xs text-slate-400">
          Compártela con el vendedor para su primer inicio de sesión.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {exito && <p className="text-sm text-green-700">{exito}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="btn-primary w-full py-2.5"
      >
        {enviando ? 'Creando...' : 'Crear vendedor'}
      </button>
    </form>
  )
}
