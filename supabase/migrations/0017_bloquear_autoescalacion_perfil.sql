-- Seguridad: la politica "actualizar_propio_perfil" (0001) deja que cualquiera edite su
-- propia fila con with check (id = auth.uid()), sin restringir QUE columnas puede cambiar.
-- El unico guardia hasta ahora era el trigger de "role", asi que un vendedor podia, desde la
-- consola del navegador con su propia sesion, cambiar su country/route_id/active y evadir
-- la supervision de su admin de pais (puede_administrar(country) se evalua contra el valor
-- actual de la fila) o reactivarse a si mismo. Este fix amplia el mismo trigger para bloquear
-- esos campos tambien, salvo que quien edite sea un admin/super_admin (is_admin()).
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role <> old.role then
      raise exception 'No autorizado para cambiar el rol';
    end if;
    if new.country is distinct from old.country then
      raise exception 'No autorizado para cambiar el pais';
    end if;
    if new.route_id is distinct from old.route_id then
      raise exception 'No autorizado para cambiar la region';
    end if;
    if new.active <> old.active then
      raise exception 'No autorizado para cambiar el estado activo';
    end if;
  end if;
  return new;
end;
$$;
