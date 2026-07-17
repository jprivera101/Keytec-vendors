-- Parqueo: marca de un lugar donde el vendedor dejo el carro parqueado (foto del carro +
-- ubicacion) y, al salir, la foto del recibo de pago del parqueo. No es una lista aparte: solo
-- se muestra como un pin en el mapa de la semana (MapaRuta), igual que las visitas.
create table public.parking_spots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  salesman_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  car_photo_path text not null,
  receipt_photo_path text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index parking_spots_week_id_idx on public.parking_spots (week_id);

-- Un vendedor solo puede tener un parqueo abierto a la vez (debe "salir" del actual antes de
-- marcar uno nuevo). Un segundo insert mientras hay uno abierto falla por esta restriccion.
create unique index parking_spots_one_open_idx on public.parking_spots (salesman_id) where ended_at is null;

alter table public.parking_spots enable row level security;

create policy "ver_parqueo_propio_o_admin" on public.parking_spots
for select to authenticated
using (
  salesman_id = auth.uid()
  or exists (
    select 1 from public.profiles sp
    where sp.id = parking_spots.salesman_id and public.puede_administrar(sp.country)
  )
);

create policy "crear_parqueo_en_semana_activa" on public.parking_spots
for insert to authenticated
with check (
  salesman_id = auth.uid()
  and exists (
    select 1 from public.weeks w
    where w.id = parking_spots.week_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
  )
);

-- "Salir del parqueo" es un update: agrega la foto del recibo y cierra el registro. Solo el
-- dueno puede cerrarlo, y solo mientras siga abierto (no se puede reabrir uno ya cerrado).
create policy "cerrar_parqueo_propio" on public.parking_spots
for update to authenticated
using (salesman_id = auth.uid() and ended_at is null)
with check (salesman_id = auth.uid());

-- Storage: bucket propio para las fotos de parqueo (mismo patron que gasoline-photos).
insert into storage.buckets (id, name, public)
values ('parking-photos', 'parking-photos', false)
on conflict (id) do nothing;

create policy "subir_foto_parqueo_propia" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'parking-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "leer_foto_parqueo_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'parking-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
  )
);
