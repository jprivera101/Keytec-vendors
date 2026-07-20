-- El operario ahora puede ver los depositos (foto + nombre) de sus vendedores asignados,
-- para conciliar contra las ventas que procesa. Nunca los de otros vendedores.
create policy "operario_ve_depositos_asignados" on public.deposits
for select to authenticated
using (public.operario_atiende(deposits.salesman_id));

create policy "operario_lee_foto_deposito_asignado" on storage.objects
for select to authenticated
using (
  bucket_id = 'deposit-photos'
  and public.operario_atiende(((storage.foldername(name))[1])::uuid)
);
