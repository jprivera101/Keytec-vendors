-- FIX: la foto fundadora de una tienda (primera visita) comparte archivo -- mismo bucket,
-- mismo path -- con stores.photo_path, que "nunca cambia despues" por diseño. Las funciones
-- de retencion (0039) elegian que comprimir/borrar solo por la fecha de la fila (visits,
-- sales, etc.), sin saber que ese mismo archivo tambien es la foto permanente de una tienda.
-- Diagnostico confirmo 0 fotos de tienda borradas hasta ahora, pero 63 ya tenian su visita
-- fundadora a mas de 14 dias -- elegibles para compresion en la proxima corrida. Se excluye
-- cualquier foto cuyo path aparezca en stores.photo_path, en las dos funciones genericas
-- (no solo en la de visits: es la misma proteccion sin importar de que tabla venga).

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
       and not exists (select 1 from public.stores s where s.photo_path = t.%I)
     limit %L',
    p_columna_foto, p_tabla, p_bucket, p_columna_foto,
    p_columna_foto, p_columna_fecha, p_columna_fecha, p_columna_foto, limite
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
       and not exists (select 1 from public.stores s where s.photo_path = t.%I)
     limit %L',
    p_columna_foto, p_tabla, p_bucket, p_columna_foto,
    p_columna_foto, p_columna_fecha, p_columna_foto, limite
  );
end;
$$;

revoke execute on function public.fotos_para_eliminar(text, text, text, text, int) from public;
grant execute on function public.fotos_para_eliminar(text, text, text, text, int) to service_role;

-- Limpieza del diagnostico temporal (0042): ya cumplio su proposito.
drop function if exists public._diag_fotos_tiendas();
