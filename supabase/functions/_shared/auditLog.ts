// Escribe una fila en security_audit_log usando el cliente de service_role (ignora RLS).
// Nunca debe recibir valores sensibles (contraseñas, tokens) en `metadata`.
// deno-lint-ignore no-explicit-any
export async function registrarAuditoria(
  adminClient: any,
  entrada: {
    actor_id: string;
    action: string;
    target_id?: string | null;
    target_type?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await adminClient.from("security_audit_log").insert({
    actor_id: entrada.actor_id,
    action: entrada.action,
    target_id: entrada.target_id ?? null,
    target_type: entrada.target_type ?? null,
    metadata: entrada.metadata ?? null,
  });
  if (error) {
    console.error(`No se pudo registrar auditoria (${entrada.action}):`, error.message);
  }
}
