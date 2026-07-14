-- Reafirma (sin cambiar la logica) la politica de lectura de fotos privadas, por si una
-- corrida anterior de 0005/0010 se pego solo parcialmente en el editor SQL y quedo una
-- version vieja activa. Es idempotente: no rompe nada si ya estaba correcta.

drop policy if exists "leer_foto_propia_o_admin" on storage.objects;
create policy "leer_foto_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id in ('visit-photos', 'sale-photos')
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and public.puede_administrar(p.country)
    )
    or (
      bucket_id = 'sale-photos'
      and public.operario_atiende(((storage.foldername(name))[1])::uuid)
    )
  )
);
