-- Las tiendas no tenian foto propia (solo la de cada visita). A partir de ahora la tienda
-- guarda la foto de su PRIMERA visita (la del momento en que se registro) de forma
-- permanente, para poder mostrarla en el mapa sin depender de cual fue la visita mas
-- reciente. Se hace backfill de las tiendas que ya existen usando su visita mas antigua.

alter table public.stores add column photo_path text;

update public.stores s
set photo_path = primera_visita.photo_path
from (
  select distinct on (store_id) store_id, photo_path
  from public.visits
  where store_id is not null
  order by store_id, captured_at asc
) as primera_visita
where primera_visita.store_id = s.id;
