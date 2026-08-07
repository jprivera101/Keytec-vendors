-- Permite a un admin/super_admin corregir el monto de una venta ya cargada, o cancelarla (con
-- motivo obligatorio) si nunca debio contar -- p.ej. el vendedor se equivoco de tienda o
-- duplico la venta. Cancelar no borra la fila: la marca como cancelada para que quede un
-- historial completo (quien, cuando, por que) en la propia tabla, sin necesitar una tabla de
-- auditoria aparte -- ese registro es justamente el "log de ventas canceladas" que se
-- consulta desde el admin.

alter table public.sales
  add column cancelled boolean not null default false,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid,
  add column cancel_reason text;

-- Nombrada explicitamente (en vez de dejar el nombre por defecto de Postgres) para poder
-- desambiguarla en selects embebidos: sales ya llega a "profiles" por otro camino
-- (visits -> weeks -> salesman_id), asi que un segundo embed a traves de cancelled_by
-- necesita indicar cual FK usar.
alter table public.sales
  add constraint sales_cancelled_by_fkey foreign key (cancelled_by) references public.profiles(id);

alter table public.sales
  add constraint sales_cancel_reason_requerido
  check (not cancelled or (cancel_reason is not null and length(trim(cancel_reason)) > 0));

alter table public.shipment_sales
  add column cancelled boolean not null default false,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid,
  add column cancel_reason text;

alter table public.shipment_sales
  add constraint shipment_sales_cancelled_by_fkey foreign key (cancelled_by) references public.profiles(id);

alter table public.shipment_sales
  add constraint shipment_sales_cancel_reason_requerido
  check (not cancelled or (cancel_reason is not null and length(trim(cancel_reason)) > 0));

-- Admin del pais (o super_admin de cualquiera) puede editar el monto o cancelar la venta.
create policy "admin_edita_venta" on public.sales
for update to authenticated
using (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    join public.profiles sp on sp.id = w.salesman_id
    where v.id = sales.visit_id
      and public.puede_administrar(sp.country)
  )
)
with check (
  exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    join public.profiles sp on sp.id = w.salesman_id
    where v.id = sales.visit_id
      and public.puede_administrar(sp.country)
  )
);

create policy "admin_edita_venta_envio" on public.shipment_sales
for update to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = shipment_sales.week_id
      and public.puede_administrar(sp.country)
  )
)
with check (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = shipment_sales.week_id
      and public.puede_administrar(sp.country)
  )
);

-- Una venta cancelada no se puede marcar como procesada -- se reemplazan las policies del
-- operario para bloquearlo tambien a nivel de base de datos, no solo ocultando el botón.
drop policy "operario_marca_procesada" on public.sales;
create policy "operario_marca_procesada" on public.sales
for update to authenticated
using (
  not sales.cancelled
  and exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.id = sales.visit_id and public.operario_atiende(w.salesman_id)
  )
)
with check (
  not sales.cancelled
  and exists (
    select 1 from public.visits v
    join public.weeks w on w.id = v.week_id
    where v.id = sales.visit_id and public.operario_atiende(w.salesman_id)
  )
);

drop policy "operario_marca_procesada_envio" on public.shipment_sales;
create policy "operario_marca_procesada_envio" on public.shipment_sales
for update to authenticated
using (
  not shipment_sales.cancelled
  and exists (
    select 1 from public.weeks w
    where w.id = shipment_sales.week_id and public.operario_atiende(w.salesman_id)
  )
)
with check (
  not shipment_sales.cancelled
  and exists (
    select 1 from public.weeks w
    where w.id = shipment_sales.week_id and public.operario_atiende(w.salesman_id)
  )
);
