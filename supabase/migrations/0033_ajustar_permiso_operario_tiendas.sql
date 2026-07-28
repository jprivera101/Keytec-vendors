-- Las policies de 0032 dejaban al operario ver una tienda (y su codigo) por el solo hecho de
-- que un vendedor suyo la hubiera visitado, aunque esa visita nunca generara una venta -- mas
-- acceso del que necesita. Se ajustan para que solo aplique cuando de verdad hay una venta
-- suya de por medio (lo que necesita para procesarla), nunca por la visita sola.
drop policy "operario_ve_tiendas_que_atiende" on public.stores;

create policy "operario_ve_tiendas_con_venta" on public.stores
for select to authenticated
using (
  exists (
    select 1 from public.sales sa
    join public.visits v on v.id = sa.visit_id
    join public.weeks w on w.id = v.week_id
    where v.store_id = stores.id and public.operario_atiende(w.salesman_id)
  )
);

drop policy "ver_codigo_operario_o_admin" on public.store_codes;
create policy "ver_codigo_operario_o_admin" on public.store_codes
for select to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.sales sa
    join public.visits v on v.id = sa.visit_id
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
);

drop policy "fijar_codigo_operario_o_admin" on public.store_codes;
create policy "fijar_codigo_operario_o_admin" on public.store_codes
for insert to authenticated
with check (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.sales sa
    join public.visits v on v.id = sa.visit_id
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
);

drop policy "corregir_codigo_operario_o_admin" on public.store_codes;
create policy "corregir_codigo_operario_o_admin" on public.store_codes
for update to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = store_codes.store_id and public.puede_administrar(s.country)
  )
  or exists (
    select 1 from public.sales sa
    join public.visits v on v.id = sa.visit_id
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
    select 1 from public.sales sa
    join public.visits v on v.id = sa.visit_id
    join public.weeks w on w.id = v.week_id
    where v.store_id = store_codes.store_id and public.operario_atiende(w.salesman_id)
  )
);
