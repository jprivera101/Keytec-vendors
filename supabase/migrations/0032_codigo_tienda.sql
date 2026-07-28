-- Codigo del negocio: el identificador que el operario usa para esa tienda en su propio
-- sistema (CRM externo). El vendedor NUNCA debe verlo -- por eso vive en su propia tabla con
-- su propia RLS, en vez de ser una columna mas de "stores" (una columna no se puede ocultar
-- por rol dentro de la misma tabla: RLS filtra filas, no columnas, y "authenticated" es el
-- mismo rol de Postgres para vendedor, operario y admin). Una tabla aparte con su propia
-- policy es la unica forma de que un vendedor, aunque pida "select *" directo a la API sin
-- pasar por la app, jamas reciba este dato.
create table public.store_codes (
  store_id uuid primary key references public.stores(id) on delete cascade,
  codigo text not null,
  set_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.store_codes enable row level security;

-- Puede leerlo un admin/super_admin, o un operario que atienda a algun vendedor que haya
-- visitado esa tienda (mismo criterio que ya usa "operario_atiende" para ventas/depositos).
create policy "ver_codigo_operario_o_admin" on public.store_codes
for select to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
);

create policy "fijar_codigo_operario_o_admin" on public.store_codes
for insert to authenticated
with check (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
);

create policy "corregir_codigo_operario_o_admin" on public.store_codes
for update to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
);

-- El operario necesita ver nombre/cliente de la tienda para reconciliar la venta (hoy no
-- tenia ninguna policy sobre "stores": el nombre le llegaba solo como texto congelado en
-- visits.store_name). Esto NO expone el codigo -- vive aparte, en store_codes.
create policy "operario_ve_tiendas_que_atiende" on public.stores
for select to authenticated
using (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.store_id = stores.id and public.operario_atiende(w.salesman_id)
  )
);
