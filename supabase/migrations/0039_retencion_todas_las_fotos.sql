-- Generaliza la retencion de fotos (antes solo visitas) a TODOS los buckets de la app:
-- visitas, ventas, kilometraje semanal, gasolina, depositos, parqueo y tracking diario.
-- Reemplaza las funciones especificas de visitas por versiones parametrizadas por
-- tabla/columna/bucket, porque varias tablas tienen mas de una columna de foto por fila
-- (weeks: inicio y fin; gasoline_logs: tres; parking_spots y daily_tracking: dos) que
-- envejecen de forma independiente segun su propia columna de fecha.
--
-- Igual que antes: nunca se toca la fila (tienda, monto, km, fechas se conservan siempre),
-- solo el archivo de la foto. Restringidas a service_role -- reciben nombre de
-- tabla/columna como parametro, así que exponerlas a authenticated/anon sería una via de
-- SQL dinamico controlado por quien las llama, no un query fijo como el resto de la app.

drop function if exists public.visitas_para_comprimir(int);
drop function if exists public.visitas_para_eliminar_foto(int);

create or replace function public.fotos_para_comprimir(
  p_tabla text, p_columna_foto text, p_columna_fecha text, p_bucket text, limite int default 200
)
returns table(photo_path text)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  return query execute format(
    'select t.%I from public.%I t
     join storage.objects o on o.bucket_id = %L and o.name = t.%I
     where t.%I is not null
       and t.%I < now() - interval ''14 days''
       and t.%I >= now() - interval ''2 months''
       and coalesce((o.metadata->>''size'')::bigint, 0) > 60000
     limit %L',
    p_columna_foto, p_tabla, p_bucket, p_columna_foto,
    p_columna_foto, p_columna_fecha, p_columna_fecha, limite
  );
end;
$$;

revoke execute on function public.fotos_para_comprimir(text, text, text, text, int) from public;
grant execute on function public.fotos_para_comprimir(text, text, text, text, int) to service_role;

create or replace function public.fotos_para_eliminar(
  p_tabla text, p_columna_foto text, p_columna_fecha text, p_bucket text, limite int default 200
)
returns table(photo_path text)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  return query execute format(
    'select t.%I from public.%I t
     join storage.objects o on o.bucket_id = %L and o.name = t.%I
     where t.%I is not null
       and t.%I < now() - interval ''2 months''
     limit %L',
    p_columna_foto, p_tabla, p_bucket, p_columna_foto,
    p_columna_foto, p_columna_fecha, limite
  );
end;
$$;

revoke execute on function public.fotos_para_eliminar(text, text, text, text, int) from public;
grant execute on function public.fotos_para_eliminar(text, text, text, text, int) to service_role;
