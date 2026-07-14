-- Gasolina: registro de cada carga (tanque antes/despues + factura + monto), para que el
-- admin pueda verificar el gasto contra las fotos. Una semana puede tener varias cargas.
create table public.gasoline_logs (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  initial_tank_photo_path text not null,
  final_tank_photo_path text not null,
  receipt_photo_path text not null,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index gasoline_logs_week_id_idx on public.gasoline_logs (week_id);

alter table public.gasoline_logs enable row level security;

create policy "ver_gasolina_propia_o_admin" on public.gasoline_logs
for select to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = gasoline_logs.week_id
      and (w.salesman_id = auth.uid() or public.puede_administrar(sp.country))
  )
);

create policy "crear_gasolina_en_semana_activa" on public.gasoline_logs
for insert to authenticated
with check (
  exists (
    select 1 from public.weeks w
    where w.id = gasoline_logs.week_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
  )
);

-- Ventas por envio: una venta que no quedo ligada a ninguna tienda/ubicacion real (p.ej. se
-- vendio despues de cerrar la semana y se registra al iniciar la siguiente). Solo lleva a
-- quien se le vendio, la foto y el monto.
create table public.shipment_sales (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  client_name text not null,
  amount numeric(10,2) not null check (amount > 0),
  photo_path text,
  created_at timestamptz not null default now()
);

create index shipment_sales_week_id_idx on public.shipment_sales (week_id);

alter table public.shipment_sales enable row level security;

create policy "ver_ventas_envio_propias_o_admin" on public.shipment_sales
for select to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = shipment_sales.week_id
      and (w.salesman_id = auth.uid() or public.puede_administrar(sp.country))
  )
);

create policy "crear_venta_envio_en_semana_activa" on public.shipment_sales
for insert to authenticated
with check (
  exists (
    select 1 from public.weeks w
    where w.id = shipment_sales.week_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
  )
);

-- Storage: bucket propio para las fotos de gasolina (mismo patron que mileage-photos).
insert into storage.buckets (id, name, public)
values ('gasoline-photos', 'gasoline-photos', false)
on conflict (id) do nothing;

create policy "subir_foto_gasolina_propia" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'gasoline-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "leer_foto_gasolina_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'gasoline-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
  )
);

-- La foto de una venta por envio se sube al bucket 'sale-photos' que ya existe (misma
-- convencion {user_id}/{archivo}), asi que ya queda cubierta por las policies
-- "subir_foto_propia" y "leer_foto_propia_o_admin" sin necesidad de nada nuevo aqui.
