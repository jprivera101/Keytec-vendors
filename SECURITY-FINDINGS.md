# Security Findings — Eurocell Ruta de Ventas

Passive code/config review, cross-checked against the live migration history and current Edge Function code. Same stack reality as before: React SPA + Vite on Vercel, no custom backend — the browser talks to Supabase directly with the public anon key, so **RLS is the entire authorization layer**. No raw SQL string-building, no `eval`, no `dangerouslySetInnerHTML` anywhere — classic injection/XSS are not realistic vectors here.

## Fixed since the last pass

1. **Profile self-escalation** (salesman rewriting their own `country`/`route_id`/`active`) — closed by `0017_bloquear_autoescalacion_perfil.sql`, which extends the role-change trigger to also block those columns unless the caller is an admin.
2. **Wildcard CORS** on all 5 Edge Functions — closed by `supabase/functions/_shared/cors.ts`, now an explicit origin allowlist (prod domain + localhost + this project's per-deploy Vercel URL pattern).
3. **No audit trail** — closed. `security_audit_log` table exists (`0018_audit_log.sql`) and every privileged Edge Function (`create-admin`, `create-operario`, `create-salesman`, `reset-password`, `set-salesman-active`) writes to it.
4. **No security headers** — closed. `vercel.json` now sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a `Content-Security-Policy-Report-Only` (still report-only — worth flipping to enforced once you've confirmed it hasn't logged any violations in the browser console for a while).
5. **Deposits ZIP export with no cap** — closed. `DepositosAdmin.tsx` now warns past 150 photos and hard-blocks past 500, pointing the admin to a per-vendor download instead.

## Fixed just now (this pass)

6. **Storage buckets had no file-size or MIME-type limit.** Any authenticated account (salesman, operario, admin) could hit the Storage API directly — bypassing the app's client-side image compression entirely — and upload an arbitrarily large or arbitrary-type file to their own folder. That's a real billing-abuse vector: enough oversized uploads inflate Supabase storage costs with no guardrail. Fixed in `0031_limites_storage_buckets.sql`: all 7 photo buckets now cap at 10 MiB (generous headroom over the ~1-2 MB the app's own compression produces) and only accept `image/jpeg|png|webp`.
7. **3 of the 4 account-creation Edge Functions didn't validate password length server-side.** `reset-password` already checked `length < 6`; `create-salesman`, `create-admin`, and `create-operario` only relied on the React form's `minLength={6}`, trivially bypassed by calling the function directly with a valid admin/super_admin token. All three now enforce the same 6-char minimum server-side. Deployed live.

## Still open — needs your call

8. **No MFA for admin/super_admin.** These accounts have country-wide or global read access to sales, cash-deposit photos, and (new) daily-tracking odometer photos. A single phished/reused password fully compromises that scope. Supabase Auth supports TOTP natively — enrollment + a check at the `/admin` gate would be additive, not a rewrite. I didn't implement this since it changes the login flow for every admin — say the word and I'll build it.
9. **`react-router` has an open high-severity advisory** (GHSA-qwww-vcr4-c8h2, CSRF bypass in "RSC mode") affecting 7.12.0–8.2.0; you're on 7.18.1. `npm audit fix --force` "fixes" it by *downgrading* to 7.11.0 — there's no forward patch published yet. I did **not** apply that: the advisory is specific to React Router's RSC/server-actions mode, which this app doesn't use at all (plain client-side `BrowserRouter`/`Routes`). Downgrading would lose 7 patch versions to dodge a code path you don't run. My read: leave it, watch for a real forward-fix release. Flag if you want the downgrade anyway.
10. **Dependencies use caret (`^`) ranges, not exact pins**, per the standard `npm install` convention — `package-lock.json` already pins exact resolved versions for reproducible builds, but only if Vercel's install step runs `npm ci` rather than `npm install` (worth confirming in the Vercel project settings if strict pinning matters to you).
11. **Backups / PITR** — a Supabase *dashboard* setting, invisible from this repo. Check directly in the Supabase project settings.
12. **No pagination cap on some admin/operario list queries** (e.g. `obtenerVentasOperario` pulls every sale + shipment sale with no limit). Not exploitable today at this team's scale, but worth a max-rows guard if the sales team grows substantially.

## Ran and applied

- `npm audit fix` (non-breaking): resolved 4 of 5 reported vulnerabilities (`brace-expansion`, `fast-uri`, `postcss` transitively updated). Only `react-router` remains — see #9 above.

## Verified as sound (no action needed)

- **No secrets in the repo or Git history.** `.env*` gitignored; service-role key only ever read via `Deno.env.get(...)` inside Edge Functions, never in frontend code.
- **Storage upload paths can't be spoofed** — every bucket's insert policy checks the path's first folder segment against the server-verified `auth.uid()`, not a client-supplied value.
- **All RLS policies are scoped `to authenticated`** (grepped the full migration history for `to public`/`to anon` on data tables — none found, aside from the expected `resolver_email_de_username` RPC grant needed for username→email lookup *before* login). An anonymous request is denied at the role level before any `USING` clause even runs, so `auth.uid() = NULL` naturally fails every ownership check.
- **`SECURITY DEFINER` helper functions** (`puede_administrar`, `operario_atiende`, `heredar_ruta_de_tienda`, `resolver_email_de_username`) all pin `set search_path = public`, which is the correct hardening for definer functions — they're intentionally definer (they need to check roles/relations across tables a caller couldn't otherwise see), not a bug.
- **Object-level scoping via RLS** remains correct across visits/sales/weeks/gasoline/shipment-sales/deposits/parking/daily-tracking — every policy joins back to `auth.uid()`, `puede_administrar()`, or `operario_atiende()`.
- **Vercel deployment protection is active** on non-aliased URLs (SSO wall).

## Suggested order of work

1. Decide on MFA for admin/super_admin (#8) — biggest real gap left.
2. Confirm Vercel's install step (`npm ci` vs `npm install`) for #10, and revisit #9 once a real react-router patch lands.
3. Flip the CSP from report-only to enforced once you've watched the console for violations for a bit.
4. Check backups/PITR in the Supabase dashboard (#11).
5. #12 (pagination) only if/when the team's data volume grows enough to matter.
