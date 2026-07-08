-- Foto obligatoria del kilometraje al iniciar/finalizar semana (ademas del numero).
alter table public.weeks add column start_mileage_photo_path text;
alter table public.weeks add column end_mileage_photo_path text;

insert into storage.buckets (id, name, public)
values ('mileage-photos', 'mileage-photos', false)
on conflict (id) do nothing;

create policy "subir_foto_km_propia" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'mileage-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "leer_foto_km_propia_o_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'mileage-photos'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
