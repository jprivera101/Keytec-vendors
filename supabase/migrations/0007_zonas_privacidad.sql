-- Zonas (territorios comerciales) por pais, asignadas a cada vendedor y heredadas
-- automaticamente por las tiendas que ese vendedor registra. Ademas, cambia la
-- privacidad de lugares/tiendas: cada vendedor ya solo ve los que el mismo creo (su
-- propia cartera de clientes), nunca la de otro vendedor. Los admins (y super_admin)
-- siguen viendo todo lo de su pais, incluidas las tiendas de cualquier zona, para
-- reportes y para el mapa de verificacion de tiendas-por-zona.

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  country public.country_code not null,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index routes_country_name_idx on public.routes (country, lower(name));

alter table public.profiles add column route_id uuid references public.routes(id);
alter table public.stores add column route_id uuid references public.routes(id);

-- La zona de una tienda se hereda de quien la crea, nunca la elige el vendedor a mano
-- ni se confia en lo que mande el cliente: evita que alguien mande un route_id ajeno.
create or replace function public.heredar_ruta_de_tienda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select route_id into new.route_id from public.profiles where id = new.created_by;
  return new;
end;
$$;

create trigger heredar_ruta_de_tienda_trigger
before insert on public.stores
for each row execute function public.heredar_ruta_de_tienda();

alter table public.routes enable row level security;

-- Una zona la ve quien puede administrar ese pais, o el vendedor al que esta asignada.
create policy "ver_rutas_de_mi_pais" on public.routes
for select to authenticated
using (
  public.puede_administrar(routes.country)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.route_id = routes.id
  )
);

-- Solo un admin (de ese pais) o super_admin crea zonas nuevas.
create policy "admin_crea_rutas" on public.routes
for insert to authenticated
with check (public.puede_administrar(routes.country));

-- Privacidad: un vendedor ya no ve los lugares/tiendas de todo el pais, solo los suyos.
drop policy "ver_lugares_de_mi_pais" on public.places;
create policy "ver_lugares_propios_o_admin" on public.places
for select to authenticated
using (
  created_by = auth.uid()
  or public.puede_administrar(places.country)
);

drop policy "crear_lugar_en_mi_pais" on public.places;
create policy "crear_lugar_en_mi_pais" on public.places
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'salesman'
      and p.active
      and p.country = places.country
  )
);

drop policy "ver_tiendas_de_mi_pais" on public.stores;
create policy "ver_tiendas_propias_o_admin" on public.stores
for select to authenticated
using (
  created_by = auth.uid()
  or public.puede_administrar(stores.country)
);

drop policy "crear_tienda_en_mi_pais" on public.stores;
create policy "crear_tienda_en_mi_pais" on public.stores
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'salesman'
      and p.active
      and p.country = stores.country
  )
);
