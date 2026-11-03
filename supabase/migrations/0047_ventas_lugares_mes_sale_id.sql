-- obtenerTopLugaresEnRango ahora trae la vista por paginas (PostgREST corta en 1000 filas sin
-- avisar, y un mes ya pasa de 1000 ventas). Paginar necesita un orden estable y unico, y la
-- vista no exponia ninguna columna unica: se agrega sale_id al final (create or replace view
-- solo permite agregar columnas al final, sin cambiar las existentes).
create or replace view public.ventas_lugares_mes
with (security_invoker = true) as
select
  sa.amount,
  sa.cancelled,
  v.store_id,
  w.start_date as week_start_date,
  s.place_id,
  s.route_id,
  s.country,
  p.name as place_name,
  r.name as route_name,
  sa.id as sale_id
from public.sales sa
join public.visits v on v.id = sa.visit_id
join public.weeks w on w.id = v.week_id
join public.stores s on s.id = v.store_id
left join public.places p on p.id = s.place_id
left join public.routes r on r.id = s.route_id
where v.store_id is not null;
