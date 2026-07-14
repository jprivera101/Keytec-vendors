// Edge Function: restablece la contraseña de un vendedor, admin de pais u operario.
// Cambiar la contraseña vía la Admin API revoca automáticamente todas las sesiones activas
// del usuario (Supabase invalida sus refresh tokens al hacerlo), asi que queda desconectado
// de inmediato en todos sus dispositivos sin ningun paso adicional.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta autorizacion" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "No autenticado" }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role, country")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !callerProfile ||
      (callerProfile.role !== "admin" && callerProfile.role !== "super_admin")
    ) {
      return jsonResponse({ error: "Solo un admin puede restablecer contraseñas" }, 403);
    }

    const body = await req.json();
    const { user_id, new_password } = body ?? {};

    if (!user_id || typeof new_password !== "string" || new_password.length < 6) {
      return jsonResponse(
        { error: "user_id y new_password (mínimo 6 caracteres) son requeridos" },
        400,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("role, country")
      .eq("id", user_id)
      .single();

    if (targetError || !targetProfile) {
      return jsonResponse({ error: "Usuario no encontrado" }, 404);
    }

    if (callerProfile.role === "admin") {
      // Un admin de pais solo puede restablecer contraseñas de vendedores de su propio pais;
      // los admins de pais y operarios los gestiona unicamente un super_admin.
      if (targetProfile.role !== "salesman" || targetProfile.country !== callerProfile.country) {
        return jsonResponse(
          { error: "No autorizado para restablecer la contraseña de este usuario" },
          403,
        );
      }
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }

    return jsonResponse({ id: user_id }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
