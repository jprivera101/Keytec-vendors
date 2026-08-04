-- El primer dia de tracking de una semana podia registrarse con un km inicial menor al que
-- se cargo al iniciar la semana (start_mileage_km): validar_km_tracking_diario() solo
-- comparaba contra el ultimo dia conocido del vendedor, que es null cuando todavia no tiene
-- ningun dia registrado (su primera semana) o cuando el ultimo dia pertenece a una semana
-- anterior con datos inconsistentes. Ya se corrigio en el cliente (TrackingDiarioModal); se
-- refuerza aca por si alguien llama a la API directo.
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
  where salesman_id = new.salesman_id and tracking_date < new.tracking_date
  order by tracking_date desc
  limit 1;

  if ultimo_km is not null and new.start_km < ultimo_km then
    raise exception 'El kilometraje inicial no puede ser menor al del día anterior (%)', ultimo_km;
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
