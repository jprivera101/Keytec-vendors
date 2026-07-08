-- Multi-pais: Guatemala y El Salvador, con admins por pais y un super_admin que ve todo.

create type public.country_code as enum ('GT', 'SV');

alter table public.profiles add column country public.country_code;

-- El guard de cambio de rol solo debe aplicar a cambios hechos por la app (con un usuario
-- autenticado). Sin este ajuste, hasta este mismo script de migracion (que corre sin
-- auth.uid(), como el editor SQL) se bloquearia a si mismo al promover al super_admin.
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end;
$$;

-- El/los admin(s) existentes (de las pruebas) pasan a ser super_admin.
update public.profiles set role = 'super_admin' where role = 'admin';

-- Los vendedores existentes se asumen de Guatemala.
update public.profiles set country = 'GT' where role = 'salesman' and country is null;

alter table public.profiles
  add constraint profiles_country_role_check
  check ((role = 'super_admin') = (country is null));

-- "is_admin" ahora significa "es admin de algun tipo" (admin de pais o super_admin).
-- Se sigue usando para cosas que no dependen del pais, como el trigger de cambio de rol.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  );
$$;

-- Puede administrar un pais especifico: super_admin siempre, o admin de ese mismo pais.
create or replace function public.puede_administrar(pais public.country_code)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or (p.role = 'admin' and p.country = pais))
  );
$$;

-- Perfiles: visibilidad y edicion ahora por pais, no "cualquier admin ve todo".
drop policy "ver_propio_perfil_o_admin" on public.profiles;
create policy "ver_propio_perfil_o_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.puede_administrar(country));

drop policy "admin_actualiza_cualquier_perfil" on public.profiles;
create policy "admin_actualiza_cualquier_perfil" on public.profiles
for update to authenticated
using (public.puede_administrar(country))
with check (public.puede_administrar(country));

-- Semanas: un admin de pais solo ve las semanas de vendedores de su pais.
drop policy "ver_propias_semanas_o_admin" on public.weeks;
create policy "ver_propias_semanas_o_admin" on public.weeks
for select to authenticated
using (
  salesman_id = auth.uid()
  or exists (
    select 1 from public.profiles sp
    where sp.id = weeks.salesman_id and public.puede_administrar(sp.country)
  )
);

-- Visitas: mismo criterio, a traves de la semana.
drop policy "ver_propias_visitas_o_admin" on public.visits;
create policy "ver_propias_visitas_o_admin" on public.visits
for select to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = visits.week_id
      and (w.salesman_id = auth.uid() or public.puede_administrar(sp.country))
  )
);

-- Ventas: mismo criterio, a traves de visita -> semana.
drop policy "ver_propias_ventas_o_admin" on public.sales;
create policy "ver_propias_ventas_o_admin" on public.sales
for select to authenticated
using (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    join public.profiles sp on sp.id = w.salesman_id
    where v.id = sales.visit_id
      and (w.salesman_id = auth.uid() or public.puede_administrar(sp.country))
  )
);

-- Storage: leer fotos de otro usuario solo si se puede administrar su pais.
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
  )
);

drop policy "leer_foto_km_propia_o_admin" on storage.objects;
create policy "leer_foto_km_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'mileage-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
  )
);
