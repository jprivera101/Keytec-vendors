-- Registro de auditoria (append-only) para las acciones privilegiadas que hoy no dejan
-- ningun rastro: crear admins/operarios/vendedores, restablecer contraseñas y
-- activar/desactivar vendedores. Solo las Edge Functions (con service_role, que ignora RLS)
-- escriben aqui; no existe policy de insert para "authenticated" a proposito. Solo un
-- super_admin puede leerlo (visibilidad total del sistema).
create table public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_id uuid,
  target_type text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index security_audit_log_created_at_idx on public.security_audit_log (created_at);
create index security_audit_log_actor_id_idx on public.security_audit_log (actor_id);

alter table public.security_audit_log enable row level security;

create policy "super_admin_lee_auditoria" on public.security_audit_log
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
);
