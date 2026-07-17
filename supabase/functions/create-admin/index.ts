// Edge Function: crea un admin de pais (auth + perfil).
// Solo puede ser invocada por un usuario ya autenticado con rol super_admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { registrarAuditoria } from "../_shared/auditLog.ts";

const PAISES_VALIDOS = ["GT", "SV"];

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
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
      return jsonResponse({ error: "Solo un super admin puede crear admins de pais" }, 403);
    }

    const body = await req.json();
    const { email, password, full_name, phone, country } = body ?? {};

    if (!email || !password || !full_name || !PAISES_VALIDOS.includes(country)) {
      return jsonResponse(
        { error: "email, password, full_name y country (GT o SV) son requeridos" },
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
      role: "admin",
      country,
    });

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: insertError.message }, 400);
    }

    await registrarAuditoria(adminClient, {
      actor_id: user.id,
      action: "create_admin",
      target_id: created.user.id,
      target_type: "profile",
      metadata: { email, country },
    });

    return jsonResponse({ id: created.user.id, email, full_name, country }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
