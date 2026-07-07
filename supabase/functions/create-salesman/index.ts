// Edge Function: crea un usuario vendedor (auth + perfil).
// Solo puede ser invocada por un usuario ya autenticado con rol admin.
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

    // Cliente "como el usuario que llama", para verificar que es admin.
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

    if (profileError || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Solo un admin puede crear vendedores" }, 403);
    }

    const body = await req.json();
    const { email, password, full_name, phone } = body ?? {};

    if (!email || !password || !full_name) {
      return jsonResponse({ error: "email, password y full_name son requeridos" }, 400);
    }

    // Cliente con service role: unica forma autorizada de crear usuarios.
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
      role: "salesman",
    });

    if (insertError) {
      // Revertir: no dejar un usuario de auth huerfano sin perfil.
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: insertError.message }, 400);
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
