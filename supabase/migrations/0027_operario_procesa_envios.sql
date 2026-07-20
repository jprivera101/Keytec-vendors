-- Bug: una venta por envio (shipment_sales) es una venta como cualquier otra, pero nunca
-- tuvo columnas de "procesada" ni era visible para el operario, asi que se quedaba fuera de
-- su cola de trabajo sin que nadie lo notara.
alter table public.shipment_sales add column processed boolean not null default false;
alter table public.shipment_sales add column processed_at timestamptz;
alter table public.shipment_sales add column processed_by uuid references public.profiles(id);

drop policy "ver_ventas_envio_propias_o_admin" on public.shipment_sales;
create policy "ver_ventas_envio_propias_o_admin" on public.shipment_sales
for select to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = shipment_sales.week_id
      and (
        w.salesman_id = auth.uid()
        or public.puede_administrar(sp.country)
        or public.operario_atiende(w.salesman_id)
      )
  )
);

create policy "operario_marca_procesada_envio" on public.shipment_sales
for update to authenticated
using (
  exists (
    select 1 from public.weeks w
    where w.id = shipment_sales.week_id and public.operario_atiende(w.salesman_id)
  )
)
with check (
  exists (
    select 1 from public.weeks w
    where w.id = shipment_sales.week_id and public.operario_atiende(w.salesman_id)
  )
);
