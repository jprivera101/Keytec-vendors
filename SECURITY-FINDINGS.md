# Security Findings — Eurocell Ruta de Ventas

Passive code/config review only. No penetration testing, no production data touched, no fixes applied yet — findings only, per the remediation plan's own "inventory first" instruction.

**Stack reality check (important — this is NOT a Next.js app with custom API routes):** React 19 SPA + Vite, hosted on Vercel as static assets. There is no custom backend API — the browser talks directly to Supabase (Postgres + Auth + Storage) using the public anon key. The *only* server-side code is 5 small Supabase Edge Functions (Deno) for privileged actions (create user, reset password, activate/deactivate). This means:
- **Row Level Security (RLS) policies ARE the authorization layer.** There's no separate "API route" to secure — every `supabase.from(...).select/insert/update()` call goes straight to Postgres and is gated only by the RLS policy on that table.
- **Classic SQL injection is not a realistic vector here.** There is zero raw SQL string-building anywhere in the client or edge functions — everything goes through the Supabase query builder (parameterized under the hood) or `supabase.auth.admin.*`. I grepped for `.rpc(`, string-concatenated queries, `eval(`, and `dangerouslySetInnerHTML` — none exist. React also auto-escapes all rendered text (store names, notes, client names), so stored XSS is very unlikely without a code change that introduces raw HTML rendering.
- So the real risk surface is **RLS policy correctness**, not injection.

## P0 — Confirmed, exploitable today

### 1. A salesman can rewrite their own `country`, `active`, and `route_id` directly
**File:** `supabase/migrations/0001_init.sql` (policy `actualizar_propio_perfil`), never tightened by any later migration.

```sql
create policy "actualizar_propio_perfil" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());
```

This policy has no column allowlist. The only guard on self-updates is a trigger (`prevent_role_self_change`) that blocks changing `role`. Nothing blocks `country`, `route_id`, or `active`.

**Proof of concept** (any logged-in salesman, from the browser console, using their own normal session — no exploit tooling needed):
```js
await supabase.from('profiles').update({ country: 'SV' }).eq('id', myOwnId)
```

**Real impact:**
- Every admin-visibility check in the app (`puede_administrar(sp.country)`) is evaluated live against the *current* value of `profiles.country`. A salesman who flips their own `country` immediately stops showing up in their real country-admin's queries for weeks, visits, sales, gasoline logs, shipment sales, **deposits, and parking spots** (all the tables added in the latest feature batch use this same pattern). A super_admin still sees them, but the country-admin — the person actually reviewing that salesperson day to day — does not. This is a genuine way to hide activity from oversight, not just a display quirk.
- `route_id` self-reassignment doesn't expose other vendors' stores (store visibility is scoped by `created_by`, verified in `0007_zonas_privacidad.sql`), but it does let a vendor misfile which "zone" their future stores/records land in and fall out of region-filtered admin views.
- `active` self-reactivation is narrower in practice: deactivation is *also* enforced via a Supabase Auth ban (`ban_duration: "87600h"` in `set-salesman-active/index.ts`), which blocks new logins/token refresh. So a deactivated vendor flipping their own `active` back to `true` only matters for the remainder of their currently-issued access token's life (Supabase's default is short-lived, refreshed hourly) — but during that window it does let them pass the `crear_propia_semana` active-check and start a new route week.

**Fix direction:** Either (a) extend `prevent_role_self_change` (rename it to something like `prevent_protected_self_change`) to also reject changes to `country`, `route_id`, and `active` unless the caller `is_admin()`, or (b) replace the blanket self-update policy with one that has an explicit column allowlist (`full_name`, `phone` only) and require admin privilege for everything else. Option (a) is the smaller diff given the existing trigger pattern.

**Verification:** As a salesman test account, attempt the PoC above directly against Supabase (bypassing the UI) and confirm it's rejected after the fix; confirm normal profile edits (name/phone) from the app still work.

---

## P1 — Real gaps, lower immediate blast radius

### 2. No MFA for admin / super_admin accounts
**File:** `src/features/auth/Login.tsx` — plain email + password, no second factor anywhere in the auth flow.

Admin and super_admin accounts have broad (country-wide or global) read access to customer locations, sales, and now cash-deposit photos and parking-spot GPS pings. A single phished or reused password fully compromises that scope. Supabase Auth supports TOTP MFA natively — this would be additive, not a rewrite.

**Fix direction:** Enable Supabase's MFA (TOTP) and require enrollment for `admin`/`super_admin` roles at login (check `auth.mfa` factor status before granting access to `/admin`).

### 3. Edge functions don't validate password strength server-side (except `reset-password`)
**Files:** `supabase/functions/create-salesman/index.ts`, `create-admin/index.ts`, `create-operario/index.ts` — no password length/strength check before calling `auth.admin.createUser`. Only the React form (`minLength={6}`) enforces it, which is trivially bypassed by calling the function directly. `reset-password/index.ts` *does* correctly check `new_password.length < 6` server-side — the other three should match it.

**Fix direction:** Add the same minimum-length (and ideally a stronger check) server-side in all three creation functions.

### 4. Wildcard CORS on all 5 edge functions
**Files:** all of `supabase/functions/*/index.ts` — `"Access-Control-Allow-Origin": "*"`.

Because auth is Bearer-token-based (not cookies), this isn't classic CSRF-exploitable — a third-party site can't read `localStorage` cross-origin to forge the header. But it's unnecessary exposure with no upside: any site could still trigger a request and read the JSON response *if* it ever obtained a valid token by some other means (e.g., an XSS bug on this origin, which would already be a same-origin compromise regardless of CORS). Restricting `Access-Control-Allow-Origin` to the actual production domain(s) is a free hardening step.

### 5. No audit trail for admin actions
No `audit_log`-style table anywhere in the 16 migrations. Creating admins/operarios, resetting passwords, deactivating vendors, and (new) downloading a week's worth of deposit photos all happen with no persistent record of *who* did *what* *when*. If an account is ever compromised or misused, there's currently no way to reconstruct what happened.

**Fix direction:** A minimal append-only `security_audit_log` table (actor, action, target, timestamp) written from the edge functions (they already run with service-role privileges, so this is a small addition, not a redesign).

## P2 — Cheap hardening, low urgency

### 6. No security headers / CSP
No `vercel.json` in the repo — confirmed via `curl -I` against the live production URL that only Vercel's own defaults are present (HSTS is on; there's no CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`). Given there's no `dangerouslySetInnerHTML` today, this is defense-in-depth rather than a live hole — but cheap to add and worth doing before wider rollout, especially since the app now stores cash-deposit and parking photos.

### 7. Deposits ZIP export has no size cap
`src/features/admin/DepositosAdmin.tsx` fetches and zips every photo for the selected week/vendor client-side in the admin's browser with no pagination or count limit. Not a security hole (still scoped by RLS), but a very active week/team could hang the browser tab. Worth a soft cap + warning if it ever gets large.

### 8. Backups / PITR — could not verify from code
Backup frequency and point-in-time recovery are a Supabase *project dashboard* setting, not something visible in this repository. Flagging so it gets checked directly in the Supabase dashboard rather than assumed either way.

## Verified as sound (no action needed)

- **No secrets in the repo or Git history.** `.env*` is gitignored; only `.env.example` (placeholder values) is tracked. Searched all tracked files and full Git history for `SERVICE_ROLE`, `SUPABASE_SECRET`, private-key headers, and common cloud-key patterns — no hits. The service-role key is only ever referenced by *name* (`Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`) inside Edge Functions, never hardcoded, never in frontend code. The `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` values embedded in the client bundle are *supposed* to be public — that's how Supabase's client-side model works; the anon key has no privileged access on its own, RLS is what matters.
- **Storage upload paths can't be spoofed.** Every bucket's insert policy checks `(storage.foldername(name))[1] = auth.uid()::text` against the *server-verified* JWT identity, not the client-supplied path string — confirmed a malicious client crafting `someoneElseId/x.jpg` as the upload path would still be rejected by RLS.
- **Vercel deployment protection is active.** Confirmed live: a non-aliased deployment URL 302-redirects to `vercel.com/sso-api` (Vercel's team-auth wall) rather than serving the app.
- **`npm audit` currently reports 0 known vulnerabilities.**
- **Object-level scoping is otherwise correctly enforced through RLS** for visits/sales/weeks/gasoline/shipment-sales/deposits/parking — every policy joins back to `auth.uid()` or `puede_administrar()`/`operario_atiende()`, never trusts a client-supplied owner ID directly.

## Suggested order of work

1. Fix #1 (profile self-update column allowlist) — small, high-impact, no migration risk to existing data.
2. Add MFA for admin/super_admin (#2).
3. Match password validation across the 3 creation functions (#3).
4. Restrict CORS origins (#4).
5. Add the audit log table (#5) — do this before further expanding admin-facing export features.
6. Headers/CSP (#6), export size cap (#7), confirm backups in the Supabase dashboard (#8).

Nothing here requires touching production data, and #1/#3/#4 are each a few lines. Say the word and I'll implement them one at a time, starting with #1 — I won't change anything until you tell me to.
