// Edge Function: crea un usuario vendedor (auth + perfil).
// Solo puede ser invocada por un usuario ya autenticado con rol admin o super_admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { registrarAuditoria } from "../_shared/auditLog.ts";
import { normalizarUsername, esViolacionDeUnicidad } from "../_shared/username.ts";

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

    // Cliente "como el usuario que llama", para verificar su rol y pais.
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
      return jsonResponse({ error: "Solo un admin puede crear vendedores" }, 403);
    }

    const body = await req.json();
    const { email, password, full_name, phone, route_id, km_per_gallon } = body ?? {};
    let { country } = body ?? {};

    if (!email || !password || !full_name) {
      return jsonResponse({ error: "email, password y full_name son requeridos" }, 400);
    }
    if (!route_id) {
      return jsonResponse({ error: "route_id (región) es requerido" }, 400);
    }
    const username = normalizarUsername(body?.username);
    if (!username) {
      return jsonResponse(
        { error: "username es requerido (3-32 caracteres: letras, números, punto, guion o guion bajo)" },
        400,
      );
    }

    if (callerProfile.role === "admin") {
      // Un admin de pais solo puede crear vendedores de su propio pais,
      // sin importar que pais haya mandado el formulario.
      country = callerProfile.country;
    } else if (!PAISES_VALIDOS.includes(country)) {
      return jsonResponse({ error: "country (GT o SV) es requerido" }, 400);
    }

    // Cliente con service role: unica forma autorizada de crear usuarios.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // La región debe existir y pertenecer al mismo pais del vendedor a crear.
    const { data: routeRow, error: routeError } = await adminClient
      .from("routes")
      .select("country")
      .eq("id", route_id)
      .single();

    if (routeError || !routeRow || routeRow.country !== country) {
      return jsonResponse({ error: "La región seleccionada no es válida para ese país" }, 400);
    }

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
      country,
      route_id,
      km_per_gallon: km_per_gallon ?? null,
      username,
    });

    if (insertError) {
      // Revertir: no dejar un usuario de auth huerfano sin perfil.
      await adminClient.auth.admin.deleteUser(created.user.id);
      if (esViolacionDeUnicidad(insertError)) {
        return jsonResponse({ error: "Ese nombre de usuario ya está en uso" }, 409);
      }
      return jsonResponse({ error: insertError.message }, 400);
    }

    await registrarAuditoria(adminClient, {
      actor_id: user.id,
      action: "create_salesman",
      target_id: created.user.id,
      target_type: "profile",
      metadata: { email, country, route_id },
    });

    return jsonResponse({ id: created.user.id, email, full_name }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
