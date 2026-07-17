-- Rendimiento de combustible del vendedor (km por galon), para comparar contra su gasto
-- real de gasolina. Opcional: puede no capturarse al crear el vendedor.
alter table public.profiles add column km_per_gallon numeric(6,2);
