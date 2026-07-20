-- La tienda ahora tambien guarda el nombre del cliente y su telefono (opcional). Antes solo
-- existia "name", y algunos vendedores habian puesto ahi el nombre del cliente en vez del de
-- la tienda -- por eso el update tambien permite corregir "name" de una vez.
alter table public.stores add column client_name text;
alter table public.stores add column phone text;

-- No existia policy de update para stores. Mismo criterio que para crearla: cualquier
-- vendedor activo de ese pais (no solo quien la registro), igual que ya pueden verlas todas.
create policy "actualizar_tienda_de_mi_pais" on public.stores
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'salesman'
      and p.active
      and p.country = stores.country
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'salesman'
      and p.active
      and p.country = stores.country
  )
);
