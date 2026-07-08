-- Debe ejecutarse sola: Postgres no permite usar un valor nuevo de enum
-- dentro de la misma transaccion en que se agrega.
alter type public.user_role add value 'super_admin';
