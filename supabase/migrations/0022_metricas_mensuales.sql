-- Metricas mensuales por vendedor, pre-calculadas: una fila por (vendedor, año, mes) con los
-- totales YA sumados (km recorridos, visitas, ventas). Sirve dos propositos:
-- 1) Deja lista la base para reportes año-contra-año sin tener que re-sumar visitas/ventas
--    sueltas cada vez que se pidan.
-- 2) El mes actual se refresca (upsert) cada vez que un admin abre "Mes actual" en Resumen;
--    los meses ya pasados no vuelven a cambiar (nadie puede iniciar una semana con fecha
--    retroactiva), asi que quedan "congelados" solos, sin necesidad de un cron ni de
--    triggers en cada visita/venta.
create table public.monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  salesman_id uuid not null references public.profiles(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  km_recorridos numeric(10,1),
  total_visitas int not null default 0,
  total_ventas numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (salesman_id, year, month)
);

create index monthly_metrics_salesman_idx on public.monthly_metrics (salesman_id);
create index monthly_metrics_year_month_idx on public.monthly_metrics (year, month);

alter table public.monthly_metrics enable row level security;

create policy "ver_metricas_propias_o_admin" on public.monthly_metrics
for select to authenticated
using (
  salesman_id = auth.uid()
  or exists (
    select 1 from public.profiles sp
    where sp.id = monthly_metrics.salesman_id and public.puede_administrar(sp.country)
  )
);

-- Recalcula (upsert) las metricas de TODOS los vendedores con alguna semana en ese año/mes.
-- La agregacion se hace aqui en SQL (group by), no trayendo filas sueltas de visits/sales al
-- cliente para sumarlas ahi. Solo un admin/super_admin puede llamarla.
create or replace function public.recalcular_metricas_mensuales(p_anio int, p_mes int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  with semanas_del_mes as (
    select w.id, w.salesman_id, w.start_mileage_km, w.end_mileage_km
    from public.weeks w
    where extract(year from w.start_date) = p_anio
      and extract(month from w.start_date) = p_mes
  ),
  metricas_por_semana as (
    select
      s.id as week_id,
      s.salesman_id,
      case when s.end_mileage_km is not null then s.end_mileage_km - s.start_mileage_km else null end as km,
      coalesce((select count(*) from public.visits vi where vi.week_id = s.id), 0) as visitas,
      coalesce(
        (select sum(sa.amount) from public.visits vi join public.sales sa on sa.visit_id = vi.id where vi.week_id = s.id),
        0
      ) + coalesce(
        (select sum(se.amount) from public.shipment_sales se where se.week_id = s.id),
        0
      ) as ventas
    from semanas_del_mes s
  )
  insert into public.monthly_metrics (salesman_id, year, month, km_recorridos, total_visitas, total_ventas, updated_at)
  select
    salesman_id,
    p_anio,
    p_mes,
    sum(km) filter (where km is not null),
    sum(visitas),
    sum(ventas),
    now()
  from metricas_por_semana
  group by salesman_id
  on conflict (salesman_id, year, month)
  do update set
    km_recorridos = excluded.km_recorridos,
    total_visitas = excluded.total_visitas,
    total_ventas = excluded.total_ventas,
    updated_at = now();
end;
$$;

grant execute on function public.recalcular_metricas_mensuales(int, int) to authenticated;
