-- El admin fija una contraseña temporal al crear una cuenta o al restablecerla (ver
-- reset-password). Esta bandera marca que la contraseña actual es "temporal": la app la lee
-- despues de iniciar sesion y, si es true, obliga a definir una nueva antes de dejar usar el
-- resto de la app. El propio usuario la pone en false una vez que elige su contraseña
-- (self-service; no hace falta protegerla en el trigger de autoescalacion porque no afecta
-- el acceso de nadie mas que el propio usuario).
alter table public.profiles add column must_change_password boolean not null default true;

-- Los perfiles que ya existen se quedan con su contraseña actual: no se les debe forzar
-- este flujo retroactivamente.
update public.profiles set must_change_password = false;
