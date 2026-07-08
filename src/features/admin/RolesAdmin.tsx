import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { IconRoles } from '../../components/icons'
import { VendedoresAdmin } from './VendedoresAdmin'
import { AdminsAdmin } from './AdminsAdmin'
import { OperariosAdmin } from './OperariosAdmin'

type Tab = 'vendedores' | 'admins' | 'operarios'

export function RolesAdmin() {
  const [tab, setTab] = useState<Tab>('vendedores')

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconRoles />}
        color="brand"
        title="Roles y accesos"
        subtitle="Un solo lugar para administrar quién puede entrar al sistema: vendedores, admins de país y operarios."
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        <TabButton activo={tab === 'vendedores'} onClick={() => setTab('vendedores')}>
          Vendedores
        </TabButton>
        <TabButton activo={tab === 'admins'} onClick={() => setTab('admins')}>
          Admins de país
        </TabButton>
        <TabButton activo={tab === 'operarios'} onClick={() => setTab('operarios')}>
          Operarios
        </TabButton>
      </div>

      {tab === 'vendedores' && <VendedoresAdmin mostrarEncabezado={false} />}
      {tab === 'admins' && <AdminsAdmin mostrarEncabezado={false} />}
      {tab === 'operarios' && <OperariosAdmin mostrarEncabezado={false} />}
    </div>
  )
}

function TabButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        activo ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
