-- Permite al admin corregir el monto de una carga de gasolina cuando el vendedor se
-- equivoco al capturarlo (las fotos y la semana no cambian, solo el monto).
create policy "admin_edita_monto_gasolina" on public.gasoline_logs
for update to authenticated
using (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = gasoline_logs.week_id
      and public.puede_administrar(sp.country)
  )
)
with check (
  exists (
    select 1 from public.weeks w
    join public.profiles sp on sp.id = w.salesman_id
    where w.id = gasoline_logs.week_id
      and public.puede_administrar(sp.country)
  )
);
