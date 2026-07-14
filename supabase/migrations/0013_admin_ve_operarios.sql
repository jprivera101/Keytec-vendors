-- Un admin de pais necesita ver el NOMBRE de los operarios para mostrar, en Vendedores, cual
-- operario tiene asignado cada uno. La politica existente "ver_propio_perfil_o_admin" usa
-- puede_administrar(country), pero el country de un operario es NULL (cruza paises), asi que
-- esa condicion nunca es verdadera para un admin de pais — solo un super_admin pasaba. Esta
-- politica adicional (se suman, no reemplazan) cubre ese caso: cualquier admin puede leer
-- perfiles de operarios, sin importar su propio pais.
drop policy if exists "admin_ve_operarios" on public.profiles;
create policy "admin_ve_operarios" on public.profiles
for select to authenticated
using (role = 'operario' and public.is_admin());
