-- FIX: la lista de tiendas del admin (obtenerTiendasConEstadisticas) traia cada tienda del
-- pais/region elegido y despues, en el cliente, encadenaba un .in(storeIds) sobre visits y
-- luego un .in(visitIds) sobre sales para sumar visitas/ventas por tienda. Con pocas tiendas
-- de prueba esto pasaba desapercibido, pero en produccion (285 tiendas, miles de visitas
-- historicas) la lista de ids de ese segundo .in() crece tanto que la consulta falla (URL
-- demasiado larga) -- y como el componente no distinguia error de "0 filas", la tabla se veia
-- vacia con "Todavia no hay tiendas registradas" sin ningun aviso de que en realidad fallo.
--
-- La solucion correcta es calcular esos totales en la base de datos (un solo query con JOIN +
-- GROUP BY, sin listas de ids), lo que de paso permite paginar de verdad: antes se traian
-- TODAS las tiendas del filtro para ordenarlas en el cliente, ahora se pide una pagina (50) ya
-- ordenada por la base de datos.

create index if not exists visits_store_id_idx on public.visits (store_id);

-- security_invoker=true: la vista corre con los permisos de quien consulta, no del dueño de la
-- vista, para que las mismas policies de stores/places/routes/visits/sales sigan aplicando
-- (un admin de pais sigue viendo solo su pais, un super_admin ve todo, etc.) -- la vista es
-- solo una forma de precalcular los totales, no una puerta trasera que salte la RLS.
create or replace view public.stores_con_estadisticas
with (security_invoker = true) as
select
  s.*,
  p.name as place_name,
  r.name as region_name,
  count(distinct v.id) as total_visitas,
  max(v.captured_at) as ultima_visita,
  coalesce(sum(sa.amount) filter (where sa.cancelled = false), 0) as total_ventas
from public.stores s
left join public.places p on p.id = s.place_id
left join public.routes r on r.id = s.route_id
left join public.visits v on v.store_id = s.id
left join public.sales sa on sa.visit_id = v.id
group by s.id, p.id, r.id;

-- Mismo problema, mismo remedio: obtenerVentasCanceladas armaba la lista de semanas del filtro,
-- despues la de visitas de esas semanas, y con ESA lista de ids filtraba "sales" -- en
-- produccion (miles de visitas historicas) esa ultima lista de ids crece tanto que la URL del
-- request se vuelve invalida y Postgrest devuelve "Bad Request". Como el componente no
-- distinguia error de "0 canceladas", se veia como si nunca hubiera ventas canceladas.
create or replace view public.ventas_canceladas
with (security_invoker = true) as
select
  sa.id,
  'venta'::text as origen,
  sa.amount,
  v.store_name,
  null::text as client_name,
  sp.full_name as salesman_name,
  sp.country,
  sp.route_id,
  sa.cancelled_at,
  coalesce(cp.full_name, 'Admin') as cancelled_by_name,
  sa.cancel_reason
from public.sales sa
join public.visits v on v.id = sa.visit_id
join public.weeks w on w.id = v.week_id
join public.profiles sp on sp.id = w.salesman_id
left join public.profiles cp on cp.id = sa.cancelled_by
where sa.cancelled
union all
select
  ss.id,
  'envio'::text as origen,
  ss.amount,
  null::text as store_name,
  ss.client_name,
  sp.full_name as salesman_name,
  sp.country,
  sp.route_id,
  ss.cancelled_at,
  coalesce(cp.full_name, 'Admin') as cancelled_by_name,
  ss.cancel_reason
from public.shipment_sales ss
join public.weeks w on w.id = ss.week_id
join public.profiles sp on sp.id = w.salesman_id
left join public.profiles cp on cp.id = ss.cancelled_by
where ss.cancelled;
