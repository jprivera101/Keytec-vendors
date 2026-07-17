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

/** El correo ya no es obligatorio (el login es por username), pero Supabase Auth SIEMPRE
 * necesita un correo o telefono para crear la cuenta. Si no se dio uno real, se genera uno
 * sintetico a partir del username (ya validado como unico), que nunca recibe correo real ni
 * se usa para nada mas que satisfacer ese requisito interno. */
export function emailFinal(correoDado: unknown, username: string): string {
  if (typeof correoDado === "string" && correoDado.trim()) return correoDado.trim();
  return `${username}@usuarios.eurocellventas.internal`;
}
