-- La policy de update de 0028 ("actualizar_tienda_de_mi_pais") era mas permisiva que la de
-- select/insert desde 0007: dejaba a CUALQUIER vendedor activo del pais editar CUALQUIER
-- tienda de ese pais, no solo las que puede ver (su propia cartera). La ajustamos para que
-- siga el mismo criterio "propia o admin" que ya rige ver/crear tiendas.
drop policy "actualizar_tienda_de_mi_pais" on public.stores;
create policy "actualizar_tienda_propia_o_admin" on public.stores
for update to authenticated
using (
  created_by = auth.uid()
  or public.puede_administrar(stores.country)
)
with check (
  created_by = auth.uid()
  or public.puede_administrar(stores.country)
);
