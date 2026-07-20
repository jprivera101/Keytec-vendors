-- El vendedor ahora le pone un nombre a cada deposito (que dias de venta cubre, p.ej.
-- "Lunes a miercoles"), para que el admin pueda identificarlo sin adivinar por la fecha de
-- subida. Nullable porque los depositos ya existentes no lo tienen.
alter table public.deposits add column label text;
