-- Ninguno de los buckets de fotos tenia limite de tamaño ni de tipo de archivo: cualquier
-- cuenta autenticada podia subir un archivo arbitrariamente grande (o de cualquier tipo) a su
-- propia carpeta, lo que puede disparar el costo de almacenamiento de Supabase sin que la app
-- lo note (el cliente comprime a ~1600px/JPEG antes de subir, pero eso es solo del lado del
-- navegador -- nada impide llamar a la API de Storage directamente sin pasar por la app).
-- 10 MiB es holgado frente a lo que produce comprimirImagen() (tipicamente bajo 1-2 MB).
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in (
  'visit-photos',
  'sale-photos',
  'mileage-photos',
  'gasoline-photos',
  'deposit-photos',
  'parking-photos',
  'daily-tracking-photos'
);
