// Edge Function: job de retencion de fotos, llamado una vez al dia por pg_cron (ver
// migracion 0038_retencion_cron.sql), nunca desde el navegador -- por eso no lleva CORS
// como las demas funciones. El dato de cada fila (tienda, monto, km, fechas) nunca se toca,
// solo el archivo de la foto: se reduce a miniatura despues de 14 dias y se borra del todo
// despues de 2 meses. Cubre las 12 combinaciones tabla/columna/bucket de fotos de la app --
// varias tablas tienen mas de una columna de foto por fila que envejece por separado (p.ej.
// la foto de inicio y la de fin de una semana).
import { createClient } from "npm:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const MINIATURA_LADO_MAX = 400;
const MINIATURA_CALIDAD = 50; // imagescript usa 0-100
const LOTE = 200;

interface Config {
  tabla: string;
  columnaFoto: string;
  columnaFecha: string;
  bucket: string;
}

const CONFIGS: Config[] = [
  { tabla: "visits", columnaFoto: "photo_path", columnaFecha: "captured_at", bucket: "visit-photos" },
  { tabla: "sales", columnaFoto: "photo_path", columnaFecha: "created_at", bucket: "sale-photos" },
  { tabla: "weeks", columnaFoto: "start_mileage_photo_path", columnaFecha: "started_at", bucket: "mileage-photos" },
  { tabla: "weeks", columnaFoto: "end_mileage_photo_path", columnaFecha: "ended_at", bucket: "mileage-photos" },
  { tabla: "gasoline_logs", columnaFoto: "initial_tank_photo_path", columnaFecha: "created_at", bucket: "gasoline-photos" },
  { tabla: "gasoline_logs", columnaFoto: "final_tank_photo_path", columnaFecha: "created_at", bucket: "gasoline-photos" },
  { tabla: "gasoline_logs", columnaFoto: "receipt_photo_path", columnaFecha: "created_at", bucket: "gasoline-photos" },
  { tabla: "deposits", columnaFoto: "photo_path", columnaFecha: "created_at", bucket: "deposit-photos" },
  { tabla: "parking_spots", columnaFoto: "car_photo_path", columnaFecha: "started_at", bucket: "parking-photos" },
  { tabla: "parking_spots", columnaFoto: "receipt_photo_path", columnaFecha: "ended_at", bucket: "parking-photos" },
  { tabla: "daily_tracking", columnaFoto: "start_photo_path", columnaFecha: "started_at", bucket: "daily-tracking-photos" },
  { tabla: "daily_tracking", columnaFoto: "end_photo_path", columnaFecha: "ended_at", bucket: "daily-tracking-photos" },
];

async function comprimirUna(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
) {
  const { data: archivo, error: errorDescarga } = await admin.storage.from(bucket).download(path);
  if (errorDescarga || !archivo) throw errorDescarga ?? new Error("descarga vacia");

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const imagen = await Image.decode(bytes);
  const escala = MINIATURA_LADO_MAX / Math.max(imagen.width, imagen.height);
  if (escala < 1) {
    imagen.resize(Math.round(imagen.width * escala), Math.round(imagen.height * escala));
  }
  const miniatura = await imagen.encodeJPEG(MINIATURA_CALIDAD);

  const { error: errorSubida } = await admin.storage
    .from(bucket)
    .update(path, miniatura, { contentType: "image/jpeg", upsert: true });
  if (errorSubida) throw errorSubida;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const secretEsperado = await admin.rpc("obtener_cron_secret");
  if (secretEsperado.error || req.headers.get("x-cron-secret") !== secretEsperado.data) {
    return new Response("No autorizado", { status: 401 });
  }

  const resultado: Record<string, { comprimidas: number; eliminadas: number; errores: string[] }> = {};

  for (const cfg of CONFIGS) {
    const clave = `${cfg.tabla}.${cfg.columnaFoto}`;
    resultado[clave] = { comprimidas: 0, eliminadas: 0, errores: [] };

    const { data: paraComprimir, error: errorComprimir } = await admin.rpc("fotos_para_comprimir", {
      p_tabla: cfg.tabla,
      p_columna_foto: cfg.columnaFoto,
      p_columna_fecha: cfg.columnaFecha,
      p_bucket: cfg.bucket,
      limite: LOTE,
    });
    if (errorComprimir) resultado[clave].errores.push(`consulta comprimir: ${errorComprimir.message}`);

    for (const fila of paraComprimir ?? []) {
      try {
        await comprimirUna(admin, cfg.bucket, fila.photo_path);
        resultado[clave].comprimidas++;
      } catch (e) {
        resultado[clave].errores.push(`comprimir ${fila.photo_path}: ${(e as Error).message}`);
      }
    }

    const { data: paraEliminar, error: errorEliminar } = await admin.rpc("fotos_para_eliminar", {
      p_tabla: cfg.tabla,
      p_columna_foto: cfg.columnaFoto,
      p_columna_fecha: cfg.columnaFecha,
      p_bucket: cfg.bucket,
      limite: LOTE,
    });
    if (errorEliminar) resultado[clave].errores.push(`consulta eliminar: ${errorEliminar.message}`);

    if (paraEliminar && paraEliminar.length > 0) {
      const rutas = paraEliminar.map((f: { photo_path: string }) => f.photo_path);
      const { error: errorBorrado } = await admin.storage.from(cfg.bucket).remove(rutas);
      if (errorBorrado) resultado[clave].errores.push(`eliminar lote: ${errorBorrado.message}`);
      else resultado[clave].eliminadas = rutas.length;
    }
  }

  const huboErrores = Object.values(resultado).some((r) => r.errores.length > 0);
  return new Response(JSON.stringify(resultado), {
    headers: { "Content-Type": "application/json" },
    status: huboErrores ? 207 : 200,
  });
});
