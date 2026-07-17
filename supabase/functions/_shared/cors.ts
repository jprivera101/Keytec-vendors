// CORS compartido por todas las Edge Functions. Antes cada funcion usaba
// "Access-Control-Allow-Origin: *", que no es explotable como CSRF clasico (la auth va por
// Bearer token, no por cookies), pero es una exposicion innecesaria: cualquier sitio podria
// leer la respuesta si alguna vez obtuviera un token valido por otro medio. Se restringe al
// origen real de la app (mas localhost para desarrollo).
const ALLOWED_ORIGINS = [
  "https://eurocell-app-ventas.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
