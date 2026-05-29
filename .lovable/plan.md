# Secure Admin Impersonation

## Approach

Supabase has no native "impersonate" API. The safe, password-less pattern is:

1. Admin clicks **Impersonate** on a user, supplies a **reason**.
2. An Edge Function (running with the service role) verifies the caller is `platform_admin` or `super_admin`, inserts a row in `admin_impersonation_logs`, then calls `supabase.auth.admin.generateLink({ type: 'magiclink', email: targetEmail })` and uses `verifyOtp` server-side to mint a real `{ access_token, refresh_token }` pair for the target user.
3. Frontend stashes the **current admin session** (access + refresh tokens, user id, name) in `sessionStorage` under `lovable.adminImpersonation.backup`, then calls `supabase.auth.setSession()` with the target's tokens. A separate `sessionStorage` flag `lovable.adminImpersonation.active` carries `{ log_id, target_user_id, target_name, started_at }`.
4. A global `<ImpersonationBanner />` reads the flag and renders a sticky top banner: *"You are impersonating **{User Name}**"* with a **Return to Admin** button.
5. **Return to Admin** calls an `end-impersonation` Edge Function (stamps `end_time` on the log row), then `supabase.auth.setSession()` with the saved admin tokens and clears the flags.

Because Supabase refresh tokens are rotated, the saved admin refresh token must be used exactly once — we capture it right before swapping, and the admin client picks up from there. If rotation has already invalidated it (rare, only if the user manually refreshed during impersonation), the banner falls back to forcing an admin re-login.

All authorization for impersonation is enforced **server-side in the Edge Function** plus an RLS-friendly DB function. RLS for the target user remains fully intact during the impersonated session — that's the whole point.

## Database (migration)

```sql
-- Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_admin';

-- Authoritative check
CREATE OR REPLACE FUNCTION public.can_impersonate(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('platform_admin','super_admin')
  );
$$;

CREATE TABLE public.admin_impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) >= 5),
  ip_address text,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_impersonation_logs TO authenticated;
GRANT ALL ON public.admin_impersonation_logs TO service_role;

ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view impersonation logs"
  ON public.admin_impersonation_logs FOR SELECT TO authenticated
  USING (public.can_impersonate(auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- INSERT/UPDATE only via service_role (edge functions); no client policies.

CREATE INDEX idx_impersonation_admin ON public.admin_impersonation_logs(admin_user_id, started_at DESC);
CREATE INDEX idx_impersonation_target ON public.admin_impersonation_logs(target_user_id, started_at DESC);
CREATE INDEX idx_impersonation_open ON public.admin_impersonation_logs(admin_user_id) WHERE ended_at IS NULL;
```

## Edge Functions

### `supabase/functions/impersonate-user/index.ts`
- Auth: validates the caller's JWT, looks up roles, requires `platform_admin` or `super_admin`.
- Body (Zod): `{ target_user_id: uuid, reason: string (min 5, max 500) }`.
- Resolves target email from `auth.admin.getUserById`.
- Inserts log row with admin_user_id, target_user_id, reason, ip_address (from `x-forwarded-for`), user_agent.
- Calls `auth.admin.generateLink({ type:'magiclink', email: target.email })`, then `auth.verifyOtp({ token_hash, type:'magiclink' })` with a fresh anon client to obtain a real session.
- Returns `{ log_id, access_token, refresh_token, target: { id, full_name, email } }`.

### `supabase/functions/end-impersonation/index.ts`
- Body: `{ log_id: uuid }`.
- Verifies the caller token belongs to the impersonated user (so a hijacked token can't close someone else's session) OR caller is platform_admin/super_admin restoring.
- Updates `ended_at = now()` where `id = log_id AND ended_at IS NULL`.
- Returns `{ ok: true }`.

Both functions reuse `corsHeaders` from `npm:@supabase/supabase-js@2/cors`.

## Frontend

### `src/lib/impersonation.ts`
Pure helpers: `getBackup()`, `setBackup()`, `clearBackup()`, `getActive()`, `setActive()`, `clearActive()` over `sessionStorage` with typed shapes.

### `src/hooks/useImpersonation.ts`
- `startImpersonation({ targetUserId, reason })`: gets current session → stores backup → invokes `impersonate-user` → calls `supabase.auth.setSession({ access_token, refresh_token })` → sets active flag → `window.location.assign('/')`.
- `endImpersonation()`: invokes `end-impersonation` → restores backup via `setSession` → clears flags → `window.location.assign('/admin')`.
- Exposes `isImpersonating`, `target`, loading state.

### `src/components/admin/ImpersonationBanner.tsx`
Fixed top banner (above navbar), warning palette using design tokens (`bg-destructive text-destructive-foreground`), shows target name + **Return to Admin** button. Rendered in `App.tsx` above `<BrowserRouter>` content. Pushes page content down with a body class when active.

### `src/components/admin/ImpersonateDialog.tsx`
Dialog with required `reason` textarea (min 5 chars), confirm button. Triggered from a new "Impersonate" action in `AdminUsers` rows. Only renders the trigger if the current admin has `platform_admin` or `super_admin` role (checked via `user_roles`).

### `src/App.tsx`
Mount `<ImpersonationBanner />` once at top level.

## Security notes

- Service-role key stays in the Edge Function only.
- Role check is **server-side**; client gating is UX only.
- Reason is required at DB level (CHECK constraint) and at the function level.
- `ended_at` only writable by `service_role` via Edge Function.
- IP captured from `x-forwarded-for` header in the edge function.
- During impersonation, all RLS evaluates as the target user — no privilege bleed.

## Files to create / edit

**Create**
- `supabase/migrations/<ts>_admin_impersonation.sql`
- `supabase/functions/impersonate-user/index.ts`
- `supabase/functions/end-impersonation/index.ts`
- `src/lib/impersonation.ts`
- `src/hooks/useImpersonation.ts`
- `src/components/admin/ImpersonationBanner.tsx`
- `src/components/admin/ImpersonateDialog.tsx`

**Edit**
- `src/App.tsx` — mount banner
- `src/components/admin/AdminUsers.tsx` — add "Impersonate" action

## Out of scope (call out to user)

- Assigning `platform_admin` / `super_admin` to existing users — they can promote via the existing admin UI after the migration runs, or I can seed the current admin to `super_admin` if they confirm.
- Email notifications to impersonated users (can add later).