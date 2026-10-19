-- Un vendedor que cierra su semana y abre una nueva el MISMO dia (ruta nueva) no podia
-- "empezar dia" en la semana nueva: el cliente busca el dia de hoy solo dentro de la semana
-- activa (no lo encuentra, porque quedo en la semana anterior) y al insertar chocaba con el
-- unique (salesman_id, tracking_date) -> "duplicate key value violates unique constraint
-- daily_tracking_one_per_day_idx". Una semana nueva es una ruta nueva, asi que tiene sentido
-- que tenga su propio inicio de dia (foto + km): el unico pasa a ser por semana.
drop index if exists public.daily_tracking_one_per_day_idx;
create unique index daily_tracking_one_per_day_per_week_idx
  on public.daily_tracking (salesman_id, week_id, tracking_date);

-- Con dos registros posibles el mismo dia, el km inicial del segundo tambien debe compararse
-- contra el primero (no solo contra dias anteriores).
create or replace function public.validar_km_tracking_diario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ultimo_km numeric;
  km_inicio_semana numeric;
begin
  select coalesce(end_km, start_km) into ultimo_km
  from public.daily_tracking
  where salesman_id = new.salesman_id and tracking_date <= new.tracking_date
  order by tracking_date desc, started_at desc
  limit 1;

  if ultimo_km is not null and new.start_km < ultimo_km then
    raise exception 'El kilometraje inicial no puede ser menor al del último registro (%)', ultimo_km;
  end if;

  select start_mileage_km into km_inicio_semana
  from public.weeks
  where id = new.week_id;

  if km_inicio_semana is not null and new.start_km < km_inicio_semana then
    raise exception 'El kilometraje inicial no puede ser menor al de inicio de semana (%)', km_inicio_semana;
  end if;

  return new;
end;
$$;
