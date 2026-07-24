-- "Tracking diario": igual que el toggle de parqueo, algunos vendedores necesitan reportar
-- kilometraje al empezar y terminar CADA dia (no solo al abrir/cerrar la semana completa).
-- Un registro por vendedor por dia calendario local; "terminar dia" agrega el km y la foto
-- finales al mismo registro.
alter table public.profiles add column daily_tracking_enabled boolean not null default false;

create table public.daily_tracking (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  salesman_id uuid not null references public.profiles(id) on delete cascade,
  tracking_date date not null,
  start_km numeric(10,1) not null,
  start_photo_path text not null,
  end_km numeric(10,1),
  end_photo_path text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index daily_tracking_week_id_idx on public.daily_tracking (week_id);

-- Un vendedor solo puede tener un dia abierto a la vez, y nunca dos registros para el mismo
-- dia calendario (evita "empezar dia" dos veces el mismo dia por accidente).
create unique index daily_tracking_one_per_day_idx on public.daily_tracking (salesman_id, tracking_date);

alter table public.daily_tracking enable row level security;

create policy "ver_tracking_propio_o_admin" on public.daily_tracking
for select to authenticated
using (
  salesman_id = auth.uid()
  or exists (
    select 1 from public.profiles sp
    where sp.id = daily_tracking.salesman_id and public.puede_administrar(sp.country)
  )
);

-- Igual que con el parqueo, se refuerza tambien a nivel de base de datos que el vendedor
-- tenga el toggle activo, sin depender solo de que la UI oculte el boton.
create policy "crear_tracking_si_habilitado" on public.daily_tracking
for insert to authenticated
with check (
  salesman_id = auth.uid()
  and exists (
    select 1 from public.weeks w
    join public.profiles p on p.id = w.salesman_id
    where w.id = daily_tracking.week_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
      and p.daily_tracking_enabled
  )
);

-- "Terminar dia" es un update: agrega km + foto finales y cierra el registro. Solo el dueno,
-- y solo mientras siga abierto (no se puede reabrir uno ya cerrado).
create policy "cerrar_tracking_propio" on public.daily_tracking
for update to authenticated
using (salesman_id = auth.uid() and ended_at is null)
with check (salesman_id = auth.uid());

-- Storage: bucket propio para las fotos, mismo patron que parking-photos.
insert into storage.buckets (id, name, public)
values ('daily-tracking-photos', 'daily-tracking-photos', false)
on conflict (id) do nothing;

create policy "subir_foto_tracking_propia" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'daily-tracking-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "leer_foto_tracking_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'daily-tracking-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
  )
);
