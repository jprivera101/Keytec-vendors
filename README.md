# Ruta de Ventas

Webapp para reemplazar el reporte de vendedores por WhatsApp: kilometraje al iniciar/terminar
la semana, visitas a tiendas (foto + ubicación) y ventas registradas (foto editable + monto),
con un panel de administración que dibuja la ruta de la semana en un mapa.

- **Frontend**: React + TypeScript + Vite + Tailwind CSS, PWA instalable (pensado para Android).
- **Backend**: Supabase (Postgres, Auth, Storage, RLS).
- **Mapa**: Leaflet + OpenStreetMap (sin costo, sin API key).

## Estructura

```
supabase/
  migrations/0001_init.sql     -- tablas, RLS, buckets de Storage
  functions/create-salesman/   -- Edge Function para que un admin cree vendedores
src/
  lib/            -- cliente de Supabase, tipos, helpers (imagenes, ubicacion, storage)
  components/     -- UI compartida (modal, captura de foto, editor de foto, mapa base)
  features/auth/  -- login y rutas protegidas por rol
  features/salesman/ -- flujo del vendedor (iniciar/finalizar semana, visitas, ventas)
  features/admin/    -- panel de administración, detalle de vendedor, crear vendedor
  features/shared/   -- mapa de ruta y detalle de semana (usado por vendedor y admin)
```

## 1. Crear el proyecto de Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un nuevo proyecto.
2. En **Settings → API** copia la `Project URL` y la `anon public key`.
3. Copia `.env.example` a `.env.local` y pega esos dos valores:

   ```
   cp .env.example .env.local
   ```

## 2. Aplicar el esquema de base de datos

Necesitas la [CLI de Supabase](https://supabase.com/docs/guides/cli) instalada (`npm i -g supabase` o `scoop install supabase`).

```bash
supabase login                      # abre el navegador para autenticarte
supabase link --project-ref TU_REF  # el REF esta en la URL del proyecto en supabase.com
supabase db push                    # aplica supabase/migrations/0001_init.sql
```

Esto crea las tablas (`profiles`, `weeks`, `visits`, `sales`), las políticas de seguridad (RLS)
y los buckets privados de Storage (`visit-photos`, `sale-photos`).

## 3. Publicar la Edge Function para crear vendedores

```bash
supabase functions deploy create-salesman
```

No necesitas configurar variables manualmente: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
ya están disponibles automáticamente dentro de las Edge Functions.

## 4. Crear el primer usuario admin

Los vendedores se crean desde el panel de admin (botón "+ Vendedor"), pero el primer admin
hay que crearlo a mano una vez:

1. En el dashboard de Supabase → **Authentication → Users → Add user**, crea el usuario admin
   (correo + contraseña, marca "Auto confirm user").
2. En **Table Editor → profiles**, inserta una fila con ese mismo `id` (cópialo del usuario
   recién creado), `full_name`, y `role = admin`.

## 5. Correr localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Inicia sesión con el usuario admin para crear vendedores desde
"+ Vendedor"; cada vendedor inicia sesión con el correo/contraseña que el admin le asigne.

Para probar la app como la usará el vendedor (cámara, ubicación) en un celular Android en la
misma red, usa `npm run dev -- --host` y abre la IP local desde el celular (el navegador pedirá
HTTPS para geolocalización en producción; en `localhost`/red local durante desarrollo normalmente
Chrome lo permite igual, pero para probar 100% real conviene ya tenerlo desplegado, ver paso 6).

## 6. Desplegar (Vercel)

1. Crea una cuenta gratuita en [vercel.com](https://vercel.com) e instala su CLI: `npm i -g vercel`.
2. `vercel login` (abre el navegador).
3. Desde la raíz del proyecto: `vercel` (primera vez) o `vercel --prod` (producción).
4. En el dashboard de Vercel, agrega las variables de entorno `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` (Project → Settings → Environment Variables) y vuelve a desplegar.

Una vez desplegado, el vendedor puede abrir la URL en Chrome (Android) y usar
"Agregar a pantalla de inicio" para instalarla como si fuera una app nativa.

## Flujo del vendedor

1. Inicia sesión → botón **Iniciar semana** → ingresa el kilometraje inicial.
2. Por cada tienda: **Registrar visita** (foto de la tienda + ubicación se capturan juntas).
3. Dentro de cada visita: **Agregar venta** (foto opcional editable con recorte/rotación + monto
   en quetzales). Se puede repetir "Guardar y agregar otra" cuantas veces sea necesario, para el
   caso de que el cliente compre más después.
4. Al terminar la semana: **Finalizar semana** → ingresa el kilometraje final.
5. **Historial** muestra las semanas anteriores con su propio mapa y resumen.

## Panel de administración

- Lista de vendedores con indicador de si tienen una semana activa ("en ruta").
- Detalle de vendedor → lista de semanas → detalle de semana con mapa (ruta dibujada conectando
  las visitas en orden), totales de km recorridos, número de visitas y monto total vendido, y
  el detalle de cada visita con sus fotos y ventas.
- **+ Vendedor** crea el usuario de un nuevo vendedor (correo + contraseña temporal).

## Alcance actual (qué falta a propósito)

- No hay cola de subida offline: si el vendedor pierde señal, el error se muestra y debe
  reintentar cuando recupere conexión. Vale la pena agregarlo si las zonas de ruta tienen
  muchas zonas sin señal.
- El editor de fotos permite recortar y rotar, no dibujar/marcar sobre la imagen.
- No hay notificaciones push.
- Los íconos del manifest PWA (`public/icons/*.svg`) son un placeholder genérico; conviene
  reemplazarlos por el logo real de la empresa antes de repartir la app a los vendedores.
