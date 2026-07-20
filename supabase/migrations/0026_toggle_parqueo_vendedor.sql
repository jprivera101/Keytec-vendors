-- El admin puede activar/desactivar la funcion de parqueo por vendedor (algunos no la
-- necesitan). Default true para no cambiar el comportamiento de nadie que ya la usa.
alter table public.profiles add column parking_enabled boolean not null default true;

-- Reforzar tambien a nivel de base de datos: si esta desactivada, ni un insert directo
-- deberia poder crear un parqueo, sin depender solo de que la UI oculte el boton.
drop policy "crear_parqueo_en_semana_activa" on public.parking_spots;
create policy "crear_parqueo_en_semana_activa" on public.parking_spots
for insert to authenticated
with check (
  salesman_id = auth.uid()
  and exists (
    select 1 from public.weeks w
    join public.profiles p on p.id = w.salesman_id
    where w.id = parking_spots.week_id
      and w.salesman_id = auth.uid()
      and w.status = 'active'
      and p.parking_enabled
  )
);
