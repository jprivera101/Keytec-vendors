-- Lugares (poblaciones/plazas, ej. "Sanarate", "Zacapa") y tiendas dentro de cada lugar.
-- Se eligen con listas desplegables en cascada (Lugar -> Tienda), con opcion de agregar uno
-- nuevo si es la primera vez. No hay deteccion automatica por ubicacion: el vendedor elige
-- explicitamente donde esta y que tienda visita; la foto/ubicacion/notas se siguen
-- capturando en cada visita igual que antes.

create table public.places (
  id uuid primary key default gen_random_uuid(),
  country public.country_code not null,
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index places_country_idx on public.places (country);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  country public.country_code not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index stores_place_id_idx on public.stores (place_id);
create index stores_country_idx on public.stores (country);

alter table public.visits add column store_id uuid references public.stores(id);

alter table public.places enable row level security;
alter table public.stores enable row level security;

-- Un vendedor ve todos los lugares/tiendas de su propio pais (no solo los que el creo),
-- para reconocer lo que ya se registro antes sin importar quien lo hizo.
create policy "ver_lugares_de_mi_pais" on public.places
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.country = places.country
  )
  or public.puede_administrar(places.country)
);

create policy "crear_lugar_en_mi_pais" on public.places
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'salesman'
      and p.active
      and p.country = places.country
  )
);

create policy "ver_tiendas_de_mi_pais" on public.stores
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.country = stores.country
  )
  or public.puede_administrar(stores.country)
);

create policy "crear_tienda_en_mi_pais" on public.stores
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'salesman'
      and p.active
      and p.country = stores.country
  )
);
