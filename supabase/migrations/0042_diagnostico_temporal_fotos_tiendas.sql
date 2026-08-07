-- TEMPORAL: diagnostico de solo lectura para verificar si el job de retencion de fotos
-- (retention-cleanup) alcanzo a tocar la foto permanente de alguna tienda -- comparte archivo
-- con la visita fundadora (mismo bucket, mismo path) y el job identificaba elegibilidad por
-- la fecha de la VISITA, sin saber que ese mismo archivo tambien es la foto de una tienda.
-- Se elimina en la migracion siguiente una vez confirmado.
create or replace function public._diag_fotos_tiendas()
returns table(
  total_tiendas bigint,
  tiendas_con_foto bigint,
  founding_visit_mayor_14_dias bigint,
  founding_visit_mayor_2_meses bigint,
  foto_tienda_faltante bigint,
  foto_tienda_comprimida bigint
)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    (select count(*) from public.stores) as total_tiendas,
    (select count(*) from public.stores where photo_path is not null) as tiendas_con_foto,
    (
      select count(*)
      from public.stores s
      join public.visits v on v.store_id = s.id and v.photo_path = s.photo_path
      where v.captured_at < now() - interval '14 days'
    ) as founding_visit_mayor_14_dias,
    (
      select count(*)
      from public.stores s
      join public.visits v on v.store_id = s.id and v.photo_path = s.photo_path
      where v.captured_at < now() - interval '2 months'
    ) as founding_visit_mayor_2_meses,
    (
      select count(*)
      from public.stores s
      where s.photo_path is not null
        and not exists (
          select 1 from storage.objects o where o.bucket_id = 'visit-photos' and o.name = s.photo_path
        )
    ) as foto_tienda_faltante,
    (
      select count(*)
      from public.stores s
      join storage.objects o on o.bucket_id = 'visit-photos' and o.name = s.photo_path
      where coalesce((o.metadata->>'size')::bigint, 0) > 0
        and coalesce((o.metadata->>'size')::bigint, 0) <= 60000
    ) as foto_tienda_comprimida;
$$;

grant execute on function public._diag_fotos_tiendas() to anon;
