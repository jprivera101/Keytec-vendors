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

// Cada "vercel --prod" genera ADEMAS una URL unica propia (p.ej.
// eurocell-app-ventas-i7fkwtp28-ph19.vercel.app) antes de alias-earse a la de arriba; si
// alguien prueba la app desde una de esas URLs, el origen no coincide con ninguna de la
// lista exacta y el CORS bloquea la respuesta real (aunque la funcion sí corrió). Por eso
// tambien se acepta cualquier subdominio *-ph19.vercel.app de este mismo proyecto.
const PATRON_ORIGEN_VERCEL = /^https:\/\/eurocell-app-ventas-[a-z0-9]+-ph19\.vercel\.app$/;

function esOrigenPermitido(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || PATRON_ORIGEN_VERCEL.test(origin);
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = esOrigenPermitido(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
