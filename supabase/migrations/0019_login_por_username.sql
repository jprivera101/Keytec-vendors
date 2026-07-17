-- El login pasa de correo a nombre de usuario. El correo NO se elimina (sigue en
-- auth.users, y ahora es opcional/informativo desde el punto de vista de quien inicia
-- sesion) pero cada perfil gana un "username" propio, unico (sin importar mayusculas) y que
-- solo un admin/super_admin puede asignar o cambiar.
alter table public.profiles add column username text;

create unique index profiles_username_unique_idx on public.profiles (lower(username));

-- Extiende el mismo trigger de "no autoescalacion" (ver 0017): el propio usuario tampoco
-- puede cambiarse el username, solo un admin.
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
    if new.username is distinct from old.username then
      raise exception 'No autorizado para cambiar el nombre de usuario';
    end if;
  end if;
  return new;
end;
$$;

-- Traduce un username a su correo real (lo unico que Supabase Auth necesita para iniciar
-- sesion). Se llama de forma anonima, ANTES de autenticarse, por eso es security definer
-- (para poder leer auth.users y profiles sin que la RLS de por medio lo bloquee) y se le da
-- permiso de ejecucion a "anon". No devuelve ni expone nada mas que el correo.
create or replace function public.resolver_email_de_username(nombre_usuario text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(nombre_usuario)
  limit 1;
$$;

grant execute on function public.resolver_email_de_username(text) to anon, authenticated;
