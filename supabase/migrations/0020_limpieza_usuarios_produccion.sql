-- LEE ANTES DE CORRER: este script borra cuentas completas (auth.users, que en cascada
-- borra su fila en profiles y a su vez TODAS sus semanas/visitas/ventas/gasolina/depositos/
-- parqueos). Es irreversible.
--
-- Logica: identifica los EXACTAMENTE 4 perfiles que deben sobrevivir (Ulises, "vendedor 1",
-- Abraham Perez, y el super_admin juanrivera@penthouseconsultings.com), y si de verdad son
-- 4 (ni mas ni menos), borra todo lo demas y les asigna su username. Si el conteo no da
-- exactamente 4 el script se cancela solo sin cambiar nada. "vendedor 1" y "Abraham Perez"
-- se emparejan por nombre exacto (confirmados); Ulises solo por nombre de pila (%ulises%,
-- unico dato confirmado); el super_admin por su correo exacto.

begin;

do $$
declare
  ids_mantener uuid[];
  total int;
begin
  select array_agg(id) into ids_mantener
  from (
    select p.id from public.profiles p
    where p.role = 'salesman' and p.full_name ilike '%ulises%'
    union
    select p.id from public.profiles p
    where p.role = 'salesman' and p.full_name ilike 'vendedor 1'
    union
    select p.id from public.profiles p
    where p.role = 'operario' and p.full_name ilike 'abraham perez'
    union
    select p.id from public.profiles p
    join auth.users u on u.id = p.id
    where u.email = 'juanrivera@penthouseconsultings.com' and p.role = 'super_admin'
  ) encontrados;

  total := coalesce(array_length(ids_mantener, 1), 0);
  if total <> 4 then
    raise exception 'Se esperaban exactamente 4 perfiles a conservar, se encontraron % - revisa los patrones antes de reintentar', total;
  end if;

  -- places.created_by, stores.created_by, sales.processed_by y security_audit_log.actor_id
  -- referencian profiles(id) SIN "on delete cascade" (a proposito: una tienda o una venta
  -- procesada no debe desaparecer solo porque quien la creo/proceso se borra). Hay que
  -- limpiar esas referencias antes del delete o la base de datos lo rechaza.
  update public.places set created_by = null
  where created_by is not null and not (created_by = any(ids_mantener));

  update public.stores set created_by = null
  where created_by is not null and not (created_by = any(ids_mantener));

  update public.sales set processed_by = null
  where processed_by is not null and not (processed_by = any(ids_mantener));

  update public.security_audit_log set actor_id = null
  where actor_id is not null and not (actor_id = any(ids_mantener));

  -- Borra todo lo demas. Cascada: auth.users -> profiles -> weeks/visits/sales/gasolina/
  -- depositos/parqueos/operario_asignaciones.
  delete from auth.users u
  where not (u.id = any(ids_mantener));

  -- Asigna los 4 usernames confirmados.
  update public.profiles set username = 'ureyes'
  where id = any(ids_mantener) and role = 'salesman' and full_name ilike '%ulises%';

  update public.profiles set username = 'pruebas1'
  where id = any(ids_mantener) and role = 'salesman' and full_name ilike 'vendedor 1';

  update public.profiles set username = 'aperez'
  where id = any(ids_mantener) and role = 'operario' and full_name ilike 'abraham perez';

  update public.profiles set username = 'jprivera'
  where id = any(ids_mantener) and role = 'super_admin';
end $$;

-- Con exactamente 4 perfiles y los 4 ya con username, ya se puede exigir que sea obligatorio.
alter table public.profiles alter column username set not null;

commit;
