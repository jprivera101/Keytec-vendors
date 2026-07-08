// Edge Function: crea un operario (auth + perfil) y le asigna los vendedores indicados.
// Solo puede ser invocada por un usuario autenticado con rol super_admin.
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || callerProfile?.role !== "super_admin") {
      return jsonResponse({ error: "Solo un super admin puede crear operarios" }, 403);
    }

    const body = await req.json();
    const { email, password, full_name, phone, salesman_ids } = body ?? {};

    if (
      !email ||
      !password ||
      !full_name ||
      !Array.isArray(salesman_ids) ||
      salesman_ids.length === 0
    ) {
      return jsonResponse(
        { error: "email, password, full_name y al menos un vendedor asignado son requeridos" },
        400,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      return jsonResponse({ error: createError?.message ?? "No se pudo crear el usuario" }, 400);
    }

    const { error: insertError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      full_name,
      phone: phone ?? null,
      role: "operario",
      country: null,
    });

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: insertError.message }, 400);
    }

    const filas = (salesman_ids as string[]).map((salesman_id) => ({
      operario_id: created.user.id,
      salesman_id,
    }));
    const { error: asignError } = await adminClient.from("operario_asignaciones").insert(filas);

    if (asignError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: asignError.message }, 400);
    }

    return jsonResponse({ id: created.user.id, email, full_name }, 200);
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
