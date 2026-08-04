-- Permite a un super_admin corregir directamente un kilometraje mal tecleado por el
-- vendedor (tracking diario o el de inicio/fin de semana). A diferencia de "reabrir" (que
-- borra el cierre para que el vendedor lo vuelva a hacer), esto edita el numero ya cargado
-- sin tocar fotos ni fechas. Se restringe a super_admin (no admin de pais) via RPC en vez de
-- una policy de RLS porque RLS no puede distinguir "solo estas columnas" ni "solo este rol
-- especifico" sin duplicar toda la logica de puede_administrar.
create or replace function public.editar_km_tracking_diario(
  p_id uuid,
  p_start_km numeric,
  p_end_km numeric
)
returns public.daily_tracking
language plpgsql
security definer
set search_path = public
as $$
declare
  fila public.daily_tracking;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'Solo un super admin puede editar el kilometraje directamente';
  end if;

  update public.daily_tracking
  set start_km = p_start_km,
      end_km = p_end_km
  where id = p_id
  returning * into fila;

  if fila.id is null then
    raise exception 'Registro de tracking no encontrado';
  end if;

  return fila;
end;
$$;

grant execute on function public.editar_km_tracking_diario(uuid, numeric, numeric) to authenticated;

create or replace function public.editar_km_semana(
  p_week_id uuid,
  p_start_mileage_km numeric,
  p_end_mileage_km numeric
)
returns public.weeks
language plpgsql
security definer
set search_path = public
as $$
declare
  fila public.weeks;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'Solo un super admin puede editar el kilometraje directamente';
  end if;

  if p_end_mileage_km is not null and p_end_mileage_km < p_start_mileage_km then
    raise exception 'El kilometraje final no puede ser menor al inicial';
  end if;

  update public.weeks
  set start_mileage_km = p_start_mileage_km,
      end_mileage_km = p_end_mileage_km
  where id = p_week_id
  returning * into fila;

  if fila.id is null then
    raise exception 'Semana no encontrada';
  end if;

  return fila;
end;
$$;

grant execute on function public.editar_km_semana(uuid, numeric, numeric) to authenticated;
