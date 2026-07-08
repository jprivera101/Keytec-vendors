// Edge Function: activa o desactiva el acceso de un vendedor.
// Desactivar bloquea el login (ban en Supabase Auth) pero NUNCA borra datos:
// las semanas/visitas/ventas del vendedor permanecen intactas para reportes.
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
      return jsonResponse({ error: "Solo un admin puede gestionar vendedores" }, 403);
    }

    const body = await req.json();
    const { salesman_id, active } = body ?? {};

    if (!salesman_id || typeof active !== "boolean") {
      return jsonResponse({ error: "salesman_id y active (boolean) son requeridos" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (callerProfile.role === "admin") {
      // Un admin de pais solo puede activar/desactivar vendedores de su propio pais.
      const { data: targetProfile, error: targetError } = await adminClient
        .from("profiles")
        .select("country")
        .eq("id", salesman_id)
        .single();

      if (targetError || !targetProfile || targetProfile.country !== callerProfile.country) {
        return jsonResponse({ error: "No autorizado para gestionar este vendedor" }, 403);
      }
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(salesman_id, {
      ban_duration: active ? "none" : "87600h",
    });

    if (banError) {
      return jsonResponse({ error: banError.message }, 400);
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ active })
      .eq("id", salesman_id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }

    return jsonResponse({ id: salesman_id, active }, 200);
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
