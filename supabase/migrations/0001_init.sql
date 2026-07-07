-- Esquema inicial: perfiles, semanas, visitas y ventas.
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'salesman');
create type public.week_status as enum ('active', 'completed');

-- Perfiles (1 a 1 con auth.users), guarda el rol de cada usuario.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'salesman',
  phone text,
  created_at timestamptz not null default now()
);

-- Una semana de trabajo de un vendedor (kilometraje inicial/final).
create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  salesman_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  start_mileage_km numeric(10,1) not null,
  end_mileage_km numeric(10,1),
  status week_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Un vendedor solo puede tener una semana activa a la vez.
create unique index one_active_week_per_salesman on public.weeks (salesman_id) where status = 'active';
create index weeks_salesman_id_idx on public.weeks (salesman_id);

-- Visita a una tienda: foto + ubicacion capturadas juntas (como en WhatsApp).
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  store_name text,
  photo_path text not null,
  latitude double precision not null,
  longitude double precision not null,
  notes text,
  captured_at timestamptz not null default now()
);

create index visits_week_id_idx on public.visits (week_id);

-- Una venta reportada en una visita. Varias filas = "mando la foto otra vez".
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  photo_path text,
  created_at timestamptz not null default now()
);

create index sales_visit_id_idx on public.sales (visit_id);

-- Helper: es el usuario actual un admin? (security definer para evitar recursion de RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Nadie (aparte de un admin) puede cambiarse el rol a si mismo.
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_role_self_change();

-- Row Level Security -------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.weeks enable row level security;
alter table public.visits enable row level security;
alter table public.sales enable row level security;

create policy "ver_propio_perfil_o_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "actualizar_propio_perfil" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "ver_propias_semanas_o_admin" on public.weeks
for select to authenticated
using (salesman_id = auth.uid() or public.is_admin());

create policy "crear_propia_semana" on public.weeks
for insert to authenticated
with check (salesman_id = auth.uid());

create policy "actualizar_propia_semana" on public.weeks
for update to authenticated
using (salesman_id = auth.uid())
with check (salesman_id = auth.uid());

create policy "ver_propias_visitas_o_admin" on public.visits
for select to authenticated
using (
  exists (
    select 1 from public.weeks w
    where w.id = visits.week_id
      and (w.salesman_id = auth.uid() or public.is_admin())
  )
);

create policy "crear_visita_en_semana_activa" on public.visits
for insert to authenticated
with check (
  exists (
    select 1 from public.weeks w
    where w.id = visits.week_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
  )
);

create policy "ver_propias_ventas_o_admin" on public.sales
for select to authenticated
using (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.id = sales.visit_id
      and (w.salesman_id = auth.uid() or public.is_admin())
  )
);

create policy "crear_venta_en_semana_activa" on public.sales
for insert to authenticated
with check (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.id = sales.visit_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
  )
);

-- Storage --------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false), ('sale-photos', 'sale-photos', false)
on conflict (id) do nothing;

-- Convencion de ruta: {user_id}/{archivo}. Cada quien sube dentro de su propia carpeta.
create policy "subir_foto_propia" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('visit-photos', 'sale-photos')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "leer_foto_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id in ('visit-photos', 'sale-photos')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
