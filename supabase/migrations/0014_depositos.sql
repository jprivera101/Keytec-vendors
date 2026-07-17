-- Depositos: foto del deposito de efectivo hecho por el vendedor. Solo evidencia fotografica
-- (sin monto), revisada por el admin de pais o el super_admin, quienes pueden descargar todos
-- los depositos de una semana calendario para todo el equipo (ver DepositosAdmin). No se liga
-- a "weeks" porque esa tabla es una semana de ruta POR vendedor, y aqui el admin necesita
-- elegir una sola semana calendario que aplique a todos los vendedores a la vez.
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  salesman_id uuid not null references public.profiles(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index deposits_salesman_id_idx on public.deposits (salesman_id);
create index deposits_created_at_idx on public.deposits (created_at);

alter table public.deposits enable row level security;

create policy "ver_depositos_propios_o_admin" on public.deposits
for select to authenticated
using (
  salesman_id = auth.uid()
  or exists (
    select 1 from public.profiles sp
    where sp.id = deposits.salesman_id and public.puede_administrar(sp.country)
  )
);

create policy "crear_deposito_propio" on public.deposits
for insert to authenticated
with check (salesman_id = auth.uid());

-- Storage: bucket propio para las fotos de deposito (mismo patron que gasoline-photos).
insert into storage.buckets (id, name, public)
values ('deposit-photos', 'deposit-photos', false)
on conflict (id) do nothing;

create policy "subir_foto_deposito_propia" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'deposit-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "leer_foto_deposito_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'deposit-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
  )
);
