// Reglas de username compartidas por las Edge Functions que crean cuentas.
const PATRON_USERNAME = /^[a-z0-9._-]{3,32}$/;

/** Normaliza (recorta espacios, minusculas) y valida el formato. Devuelve null si no cumple. */
export function normalizarUsername(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toLowerCase();
  return PATRON_USERNAME.test(limpio) ? limpio : null;
}

/** El indice unico de profiles.username usa el codigo estandar de Postgres para violacion
 * de unicidad (23505); esto evita mostrarle al admin un error crudo de base de datos. */
export function esViolacionDeUnicidad(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "23505" || !!error?.message?.toLowerCase().includes("duplicate key");
}
