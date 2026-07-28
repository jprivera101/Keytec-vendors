-- Tres correcciones al tracking diario:
--
-- 1) El km final de un dia no puede ser menor al inicial de ese mismo dia (ya se validaba en
--    el cliente; se refuerza con un check por si alguien llama a la API directo).
alter table public.daily_tracking
  add constraint daily_tracking_end_km_valido check (end_km is null or end_km >= start_km);

-- 2) El km inicial de un dia no puede ser menor al ultimo km conocido del vendedor (el fin,
--    o si no se cerro, el inicio, del dia anterior con registro). Esto necesita comparar
--    contra OTRA fila, asi que no alcanza con un check -- va en un trigger.
create or replace function public.validar_km_tracking_diario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ultimo_km numeric;
begin
  select coalesce(end_km, start_km) into ultimo_km
  from public.daily_tracking
  where salesman_id = new.salesman_id and tracking_date < new.tracking_date
  order by tracking_date desc
  limit 1;

  if ultimo_km is not null and new.start_km < ultimo_km then
    raise exception 'El kilometraje inicial no puede ser menor al del día anterior (%)', ultimo_km;
  end if;

  return new;
end;
$$;

create trigger validar_km_tracking_diario_trigger
before insert on public.daily_tracking
for each row execute function public.validar_km_tracking_diario();

-- 3) Si un vendedor cierra el dia por error, el admin puede "reabrirlo" (borra el km/foto
--    final y la marca de cierre) para que el vendedor lo vuelva a cerrar con el dato correcto.
-- El unique index (salesman_id, tracking_date) evita duplicar el dia -- reabrir reutiliza el
-- mismo registro, no crea uno nuevo, asi que el historial y los calculos siguen intactos.
create policy "admin_reabre_tracking" on public.daily_tracking
for update to authenticated
using (
  exists (
    select 1 from public.profiles sp
    where sp.id = daily_tracking.salesman_id and public.puede_administrar(sp.country)
  )
)
with check (
  exists (
    select 1 from public.profiles sp
    where sp.id = daily_tracking.salesman_id and public.puede_administrar(sp.country)
  )
);
