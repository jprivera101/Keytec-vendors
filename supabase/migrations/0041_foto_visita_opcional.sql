-- El admin puede desactivar la foto obligatoria en cada visita, por vendedor (algunos no la
-- necesitan si ya se verifica la ubicacion por GPS). Default true para no cambiar el
-- comportamiento de nadie que ya usa la app -- mismo patron que parking_enabled y
-- daily_tracking_enabled.
alter table public.profiles add column visit_photo_required boolean not null default true;

-- La foto de una tienda NUEVA sigue siendo obligatoria siempre, sin importar este switch: la
-- exige crearTienda() (photo_path no es opcional ahi) desde antes de esta migracion, y esa
-- misma foto es la que despues se reusa como photo_path de la visita. Este cambio solo afecta
-- visitas a una tienda YA EXISTENTE.
alter table public.visits alter column photo_path drop not null;

create or replace function public.validar_foto_visita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requiere_foto boolean;
begin
  if new.photo_path is not null then
    return new;
  end if;

  select p.visit_photo_required into requiere_foto
  from public.weeks w
  join public.profiles p on p.id = w.salesman_id
  where w.id = new.week_id;

  if coalesce(requiere_foto, true) then
    raise exception 'Esta visita necesita una foto';
  end if;

  return new;
end;
$$;

create trigger validar_foto_visita_trigger
before insert on public.visits
for each row execute function public.validar_foto_visita();
