# Phase 2 — Real Security (cross-app) — Execution Plan

> Status: PLAN (nothing applied to production). Touches the SHARED Supabase
> project `lvhqfslhcpiwshgvrnlp` used by BOTH `masterpiece-mileage` and
> `masterpiece-yard`. Do not change production until tested on a copy and the
> owner has signed off.

## 1. Confirmed diagnosis (both apps)
- Both apps embed the SAME Supabase URL + anon key and talk to the DB as the
  `anon` role only. No per-user identity ever reaches the database.
- Both "log in" by fetching the wide-open `yard_users` table and matching
  `name` + 4-digit `pin` in the browser (mileage `App.jsx` login; yard
  `App.jsx:112`). **PINs are stored in plaintext and are readable by anyone
  with the public key.**
- RLS is either OFF (`hanger_reference`, `urgent_reports`) or ON with
  `USING(true) WITH CHECK(true)` everywhere else → functionally wide open:
  anyone with the key can read/modify every row (including making themselves
  admin) across both apps.

Because RLS can only restrict by *identity* (`auth.uid()` / JWT claims), and no
real identity exists, **the auth system must be built first.** Turning on
strict RLS before that = both apps locked out instantly.

## 2. Target architecture
Preserve the name + 4-digit-PIN UX, but make the PIN check happen on the SERVER
and give each request a real, signed, per-user identity.

**Recommended: Supabase Edge Function login → signed per-user JWT.**
1. Edge Function `login(name, pin)` runs with the **service role**, validates
   against `yard_users` (PIN compared to a **hash**), and returns a short-lived
   JWT signed with the project JWT secret, carrying `sub = user.id`, `role`,
   `name`. Plus a refresh path.
2. Both apps call this function to log in, store the JWT, and send it as the
   `Authorization: Bearer <jwt>` on all data calls (the anon key is used ONLY
   to reach the login function).
3. RLS policies read the JWT claims:
   - `yard_users`: a user can read their own row; admins read all; the `pin`
     column is never exposed to clients (login is server-side now).
   - `trips`, `receipts`: a user reads/writes their own; admins (role in
     admin/senior_admin/super_admin) read all; writes validated.
   - `projects`, `materials`, `tools`, `tool_checkouts`, `transactions`,
     `categories`, `hanger_reference`, `urgent_reports`, `route_distances`,
     `mileage_settings`: authenticated-read; writes limited by role.
4. Storage: tighten the public `receipts` bucket so files are not listable.

> Alternative considered: native Supabase Auth (email + password). Rejected as
> the primary path because a 4-digit PIN is below Supabase's min password length
> and would force a UX change + manual creation/linking of 12 auth accounts. The
> Edge-Function-JWT path keeps the exact current UX. (Native Auth remains a valid
> future upgrade.)

## 3. Sequence (safe, reversible)
0. **(optional now)** Stopgap SQL to clear the 2 red "RLS disabled" errors and
   stop Supabase's emails (adds permissive policies; does NOT secure data).
1. **Staging copy** — stand up a second (free) Supabase project: recreate the
   schema, seed a few test users/rows. All build + testing happens here.
2. **Build login Edge Function** + PIN hashing (migrate existing plaintext PINs
   to hashes on the copy).
3. **Update BOTH apps** (on branches, never main): login via the function,
   store/attach the JWT, refresh handling.
4. **Write + apply RLS policies** (on the copy) per §2.3, and the storage fix.
5. **Test on staging**: every role, both apps, login + every create/read/
   update/delete path. Owner personally logs into the copy.
6. **Cut over production**: deploy function + RLS + both app updates together.
   Rollback = revert the two app deploys + relax policies to permissive (instant).
7. **Harden**: rate-limit the login function (anti-PIN-brute-force); optionally
   move to longer PINs/passwords later.

## 4. Top risks → mitigation
- **Lockout of live apps** → never touch prod until the copy is fully tested by
  the owner; keep the instant rollback (revert deploys + permissive policies).
- **Cross-app drift** → both apps cut over together; a left-behind app breaks.
- **PIN brute-force** (4 digits = 10k combos) → server-side check + rate limit +
  hashing; consider longer PIN later.
- **Free-plan limits** → staging is a separate free project, not branching.

## 5. Decisions needed from the owner
1. **Keep the 4-digit-PIN login** (recommended, via the Edge Function) or move
   to stronger passwords?
2. **OK to spin up a second free Supabase project as the test copy?**
3. Availability to **personally test login on the copy** before cutover.
