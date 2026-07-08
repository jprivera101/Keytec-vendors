-- Rol "operario": procesa las ventas subidas por los vendedores que tenga asignados.
-- Solo necesita ver tienda + foto + monto de esas ventas (nunca mapa/ubicacion), y marcarlas
-- como procesadas para llevar el registro de lo que ya paso al CRM.
-- Requiere que 0009_operario_role.sql ya se haya ejecutado y confirmado por separado.

-- El operario (como el super_admin) opera "encima" de los paises: no tiene uno fijo propio.
alter table public.profiles drop constraint profiles_country_role_check;
alter table public.profiles add constraint profiles_country_role_check
  check ((role in ('super_admin', 'operario')) = (country is null));

-- Que vendedores atiende cada operario. Relacion muchos a muchos: un operario puede atender
-- a varios vendedores, y (por si se reparten turnos) un vendedor podria tener mas de un
-- operario asignado.
create table public.operario_asignaciones (
  operario_id uuid not null references public.profiles(id) on delete cascade,
  salesman_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (operario_id, salesman_id)
);

create index operario_asignaciones_salesman_id_idx on public.operario_asignaciones (salesman_id);

alter table public.operario_asignaciones enable row level security;

create policy "operario_ve_sus_asignaciones" on public.operario_asignaciones
for select to authenticated
using (operario_id = auth.uid() or public.is_admin());

-- Solo el super_admin asigna/reasigna vendedores a un operario: un operario cruza paises,
-- asi que no encaja en el permiso de un admin de pais (puede_administrar).
create policy "super_admin_gestiona_asignaciones" on public.operario_asignaciones
for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
);

-- Estado de procesamiento de cada venta.
alter table public.sales add column processed boolean not null default false;
alter table public.sales add column processed_at timestamptz;
alter table public.sales add column processed_by uuid references public.profiles(id);

-- Helper: el operario actual (auth.uid()) tiene asignado a este vendedor?
create or replace function public.operario_atiende(vendedor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operario_asignaciones oa
    where oa.operario_id = auth.uid() and oa.salesman_id = vendedor
  );
$$;

-- Perfiles: el operario necesita ver los perfiles (nombre) de sus vendedores asignados.
drop policy "ver_propio_perfil_o_admin" on public.profiles;
create policy "ver_propio_perfil_o_admin" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.puede_administrar(country)
  or public.operario_atiende(id)
);

-- Semanas: el operario necesita atravesarlas para llegar de venta -> vendedor.
drop policy "ver_propias_semanas_o_admin" on public.weeks;
create policy "ver_propias_semanas_o_admin" on public.weeks
for select to authenticated
using (
  salesman_id = auth.uid()
  or exists (
    select 1 from public.profiles sp
    where sp.id = weeks.salesman_id and public.puede_administrar(sp.country)
  )
  or public.operario_atiende(weeks.salesman_id)
);

-- Visitas: el operario solo necesita el nombre de la tienda (la UI no pide mas), pero la
-- fila completa queda visible a nivel de RLS igual que para un admin.
drop policy "ver_propias_visitas_o_admin" on public.visits;
create policy "ver_propias_visitas_o_admin" on public.visits
for select to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = visits.week_id
      and (
        w.salesman_id = auth.uid()
        or public.puede_administrar(sp.country)
        or public.operario_atiende(w.salesman_id)
      )
  )
);

-- Ventas: mismo criterio para ver, mas permiso de actualizar (solo para marcar procesada).
drop policy "ver_propias_ventas_o_admin" on public.sales;
create policy "ver_propias_ventas_o_admin" on public.sales
for select to authenticated
using (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    join public.profiles sp on sp.id = w.salesman_id
    where v.id = sales.visit_id
      and (
        w.salesman_id = auth.uid()
        or public.puede_administrar(sp.country)
        or public.operario_atiende(w.salesman_id)
      )
  )
);

create policy "operario_marca_procesada" on public.sales
for update to authenticated
using (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.id = sales.visit_id and public.operario_atiende(w.salesman_id)
  )
)
with check (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.id = sales.visit_id and public.operario_atiende(w.salesman_id)
  )
);

-- Storage: el operario solo puede leer la foto de la venta (sale-photos), nunca la de la
-- visita/tienda ni la del kilometraje.
drop policy "leer_foto_propia_o_admin" on storage.objects;
create policy "leer_foto_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id in ('visit-photos', 'sale-photos')
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
    or (
      bucket_id = 'sale-photos'
      and public.operario_atiende(((storage.foldername(name))[1])::uuid)
    )
  )
);
