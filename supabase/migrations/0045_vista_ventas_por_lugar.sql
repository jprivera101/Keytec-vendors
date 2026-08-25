-- FIX: obtenerTopLugaresDelMes (Resumen > Mes actual > "Top 3 lugares") tenia la misma cadena
-- de .in() del lado del cliente que ya causo el bug de tiendas/ventas-canceladas vacias en
-- produccion (ver migracion 0044): semanas del mes -> .in(weekIds) sobre visits -> .in(visitIds)
-- sobre sales -> .in(storeIds) sobre stores. Con pocas semanas de prueba nunca se notaba, pero
-- en produccion (miles de visitas/ventas del mes) esas listas de ids crecen tanto que la
-- consulta falla ("Bad Request"/URL demasiado larga) y, como el componente no distinguia error
-- de "0 lugares", el bloque se veia como "Sin ventas todavia" en ambos paises.
--
-- Mismo remedio: una vista que ya trae sales/visits/weeks/stores/places/routes unidos, para que
-- el filtro de mes y pais se resuelva con columnas (sin listas de ids) en un solo query.

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
  r.name as route_name
from public.sales sa
join public.visits v on v.id = sa.visit_id
join public.weeks w on w.id = v.week_id
join public.stores s on s.id = v.store_id
left join public.places p on p.id = s.place_id
left join public.routes r on r.id = s.route_id
where v.store_id is not null;
