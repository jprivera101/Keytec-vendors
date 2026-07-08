-- Gestion de vendedores desde el admin: desactivar (no borrar) y editar cualquier perfil.

alter table public.profiles add column active boolean not null default true;

-- Un admin puede editar cualquier perfil (nombre/telefono), no solo el propio.
create policy "admin_actualiza_cualquier_perfil" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Un vendedor desactivado no puede iniciar una semana nueva, incluso si su token
-- (JWT) todavia no ha expirado (el bloqueo de login por si solo no invalida tokens ya emitidos).
drop policy "crear_propia_semana" on public.weeks;

create policy "crear_propia_semana" on public.weeks
for insert to authenticated
with check (
  salesman_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
  )
);
