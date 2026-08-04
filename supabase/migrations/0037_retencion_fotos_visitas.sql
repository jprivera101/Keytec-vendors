-- Retencion de fotos de visitas (no toca stores/sales/mileage/etc, solo visits): el dato de
-- la visita (tienda, monto vendido, ubicacion, fecha) se conserva para siempre, pero la foto
-- en si se reduce a miniatura despues de 14 dias y se borra del todo despues de 2 meses --
-- pasado ese tiempo es muy poco probable que alguien necesite ver la foto exacta de una
-- ruta vieja, y ademas el efecto de "el vendedor sabe que se revisa" ya ocurrio en el
-- momento de tomarla, no depende de guardarla para siempre.
--
-- Restringidas a service_role (no a authenticated/anon): devuelven rutas de fotos de
-- cualquier vendedor sin filtrar por pais, algo que ningun usuario comun deberia poder
-- consultar directo -- solo las llama el job de limpieza (ver retention-cleanup).

create or replace function public.visitas_para_comprimir(limite int default 200)
returns table(visit_id uuid, photo_path text)
language sql
stable
security definer
set search_path = public, storage
as $$
  select v.id, v.photo_path
  from public.visits v
  join storage.objects o on o.bucket_id = 'visit-photos' and o.name = v.photo_path
  where v.captured_at < now() - interval '14 days'
    and v.captured_at >= now() - interval '2 months'
    and coalesce((o.metadata->>'size')::bigint, 0) > 60000
  limit limite;
$$;

revoke execute on function public.visitas_para_comprimir(int) from public;
grant execute on function public.visitas_para_comprimir(int) to service_role;

create or replace function public.visitas_para_eliminar_foto(limite int default 200)
returns table(visit_id uuid, photo_path text)
language sql
stable
security definer
set search_path = public, storage
as $$
  select v.id, v.photo_path
  from public.visits v
  join storage.objects o on o.bucket_id = 'visit-photos' and o.name = v.photo_path
  where v.captured_at < now() - interval '2 months'
  limit limite;
$$;

revoke execute on function public.visitas_para_eliminar_foto(int) from public;
grant execute on function public.visitas_para_eliminar_foto(int) to service_role;
