-- Resumen (Mes / Personalizado / Top lugares) atribuia cada visita y venta a la fecha en que
-- EMPEZO su semana, no al dia en que ocurrio: una semana iniciada el 28/09 dejaba fuera de
-- "octubre" todas sus visitas de octubre (87 en oct-2026) y un dia suelto a mitad de semana
-- salia en 0. Ahora todo se cuenta por la fecha real de la visita/venta, en hora local
-- (GT y SV son UTC-6 todo el año, sin horario de verano).
--
-- Ademas, recalcular_metricas_mensuales sumaba las ventas canceladas en total_ventas.

-- 1) La vista de Top lugares expone la fecha de la visita para filtrar por ella.
create or replace view public.ventas_lugares_mes
with (security_invoker = true) as
select
  sa.amount,
  sa.cancelled,
  v.store_id,
  w.start_date as week_start_date,
  s.place_id,
  s.route_id,
  s.country,
  p.name as place_name,
  r.name as route_name,
  sa.id as sale_id,
  v.captured_at
from public.sales sa
join public.visits v on v.id = sa.visit_id
join public.weeks w on w.id = v.week_id
join public.stores s on s.id = v.store_id
left join public.places p on p.id = s.place_id
left join public.routes r on r.id = s.route_id
where v.store_id is not null;

-- 2) Calculo mensual por fecha real. Va en una funcion interna (sin chequeo de admin) para que
--    esta misma migracion pueda recalcular los meses ya guardados; la publica la envuelve.
create or replace function public.recalcular_metricas_mensuales_interno(p_anio int, p_mes int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inicio timestamptz := make_timestamptz(p_anio, p_mes, 1, 0, 0, 0, 'America/Guatemala');
  fin timestamptz := make_timestamptz(p_anio, p_mes, 1, 0, 0, 0, 'America/Guatemala') + interval '1 month';
begin
  -- Se reemplaza el mes completo: un vendedor que antes tenia fila (por una semana que empezo
  -- en el mes) pero ya no tiene actividad ni semana ahi no debe quedar con datos viejos.
  delete from public.monthly_metrics where year = p_anio and month = p_mes;

  with km as (
    -- El km solo se conoce por semana: semanas finalizadas que empezaron en el mes.
    select w.salesman_id, sum(w.end_mileage_km - w.start_mileage_km) as km
    from public.weeks w
    where extract(year from w.start_date) = p_anio
      and extract(month from w.start_date) = p_mes
      and w.end_mileage_km is not null
    group by w.salesman_id
  ),
  semanas as (
    select distinct w.salesman_id
    from public.weeks w
    where extract(year from w.start_date) = p_anio
      and extract(month from w.start_date) = p_mes
  ),
  visitas as (
    select w.salesman_id, count(*) as visitas
    from public.visits vi
    join public.weeks w on w.id = vi.week_id
    where vi.captured_at >= inicio and vi.captured_at < fin
    group by w.salesman_id
  ),
  ventas_visita as (
    select w.salesman_id, sum(sa.amount) as ventas
    from public.sales sa
    join public.visits vi on vi.id = sa.visit_id
    join public.weeks w on w.id = vi.week_id
    where vi.captured_at >= inicio and vi.captured_at < fin
      and not sa.cancelled
    group by w.salesman_id
  ),
  ventas_envio as (
    select w.salesman_id, sum(se.amount) as ventas
    from public.shipment_sales se
    join public.weeks w on w.id = se.week_id
    where se.created_at >= inicio and se.created_at < fin
      and not se.cancelled
    group by w.salesman_id
  ),
  vendedores as (
    select salesman_id from semanas
    union select salesman_id from visitas
    union select salesman_id from ventas_envio
  )
  insert into public.monthly_metrics (salesman_id, year, month, km_recorridos, total_visitas, total_ventas, updated_at)
  select
    ve.salesman_id,
    p_anio,
    p_mes,
    km.km,
    coalesce(vi.visitas, 0),
    coalesce(vv.ventas, 0) + coalesce(en.ventas, 0),
    now()
  from vendedores ve
  left join km on km.salesman_id = ve.salesman_id
  left join visitas vi on vi.salesman_id = ve.salesman_id
  left join ventas_visita vv on vv.salesman_id = ve.salesman_id
  left join ventas_envio en on en.salesman_id = ve.salesman_id;
end;
$$;

revoke all on function public.recalcular_metricas_mensuales_interno(int, int) from public, anon, authenticated;

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
  perform public.recalcular_metricas_mensuales_interno(p_anio, p_mes);
end;
$$;

grant execute on function public.recalcular_metricas_mensuales(int, int) to authenticated;

-- 3) Recalcula con la regla nueva todos los meses que ya estaban guardados.
do $$
declare
  m record;
begin
  for m in select distinct year, month from public.monthly_metrics loop
    perform public.recalcular_metricas_mensuales_interno(m.year, m.month);
  end loop;
end;
$$;
